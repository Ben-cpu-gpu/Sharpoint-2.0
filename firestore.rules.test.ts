import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces rules_version 2 and default-deny catch-all', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match\s+\/\{document=\*\*\}\s*\{\s*allow read, write:\s*if false;\s*\}/);
});

test('firestore.rules enforces email_verified, Master Gate, and strict schema keys on every collection', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rulesContent, /function\s+hasActiveUserRoot\(userId\)/);
  assert.match(rulesContent, /data\.keys\(\)\.hasAll/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly/);
  assert.match(rulesContent, /request\.time/);
});

test('firestore.rules covers every collection path declared in firebase-blueprint.json', () => {
  const paths = Object.keys(blueprint.firestore || {});
  assert.ok(paths.length >= 5);
  assert.match(rulesContent, /match \/users\/\{userId\}/);
  assert.match(rulesContent, /match \/settings\/\{settingId\}/);
  assert.match(rulesContent, /match \/sheets\/\{sheetId\}/);
  assert.match(rulesContent, /match \/tdExercises\/\{exerciseId\}/);
  assert.match(rulesContent, /match \/annales\/\{annaleId\}/);
});

test('allow list blocks never call get() or exists() and always filter by ownerId', () => {
  const listMatches = [...rulesContent.matchAll(/allow\s+list:\s*if\s+([^;]+);/g)];
  assert.ok(listMatches.length >= 4);
  for (const [, expr] of listMatches) {
    assert.equal(/\b(get|exists)\s*\(/.test(expr), false, `allow list must not use get/exists: ${expr}`);
    if (expr.trim() !== 'false') {
      assert.match(expr, /existing\(\)\.ownerId\s*==\s*request\.auth\.uid/);
    }
  }
});

test('allow get blocks guard against resource == null before reading existing().ownerId', () => {
  const getMatches = [...rulesContent.matchAll(/allow\s+get:\s*if\s+([^;]+);/g)];
  assert.equal(getMatches.length, 5);
  for (const [, expr] of getMatches) {
    assert.match(expr, /resource\s*==\s*null\s*\|\|\s*existing\(\)\.ownerId\s*==\s*request\.auth\.uid/);
  }
});
