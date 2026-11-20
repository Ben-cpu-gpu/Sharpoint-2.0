import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDocumentText,
  computeExtractionProgress,
  extractJsonFromModelText,
  mapTabToDestination,
} from './pdfTelemetry';

test('mapTabToDestination synchronizes Ring 1 category selection with IngestionModal target type', () => {
  assert.equal(mapTabToDestination('sheets'), 'sheet');
  assert.equal(mapTabToDestination('td'), 'td');
  assert.equal(mapTabToDestination('annales'), 'annale');
  assert.equal(mapTabToDestination(undefined), 'sheet');
});

test('analyzeDocumentText counts real equations, theorems, units, and skips pure page markers', () => {
  const sample = `--- [Page 1/3] ---
Chapitre 2 : Dynamique des fluides
Théorème de Bernoulli en régime permanent incompressible :
P + 1/2 * rho * v^2 + rho * g * z = Cte [Pa]
Définition : P en Pascal [Pa], v en m/s
Exercice 1 : Écoulement dans une tuyère convergente`;

  const metrics = analyzeDocumentText(sample);
  assert.equal(metrics.formulas, 1);
  assert.equal(metrics.theorems, 1);
  assert.ok(metrics.definitions >= 1);
  assert.ok(metrics.blocks >= 2);
  assert.ok(metrics.previewLines.every(line => !line.startsWith('--- [Page')));
  assert.ok(metrics.previewLines.some(line => line.includes('Bernoulli')));
});

test('extractJsonFromModelText strips <think> tags, markdown fences, and prose wrapper', () => {
  const raw = `<think>Calculons les étapes d'abord...</think>
Voici le résultat JSON :
\`\`\`json
{"title": "Thermodynamique", "theorems": []}
\`\`\`
Bonne révision.`;

  const extracted = extractJsonFromModelText(raw);
  const parsed = JSON.parse(extracted);
  assert.equal(parsed.title, 'Thermodynamique');
});

test('computeExtractionProgress derives real proportional percentages from PDF pages and AI bytes', () => {
  const reading = computeExtractionProgress({
    hasPdfFile: true,
    pdfCurrentPage: 2,
    pdfTotalPages: 4,
    pdfDone: false,
    aiPct: 0,
  });
  assert.equal(reading.pdfPct, 50);
  assert.equal(reading.aiPct, 0);
  assert.equal(reading.globalPct, 18);

  const streaming = computeExtractionProgress({
    hasPdfFile: true,
    pdfCurrentPage: 4,
    pdfTotalPages: 4,
    pdfDone: true,
    aiPct: 60,
  });
  assert.equal(streaming.pdfPct, 100);
  assert.equal(streaming.aiPct, 60);
  assert.equal(streaming.globalPct, 74);

  const rawTextOnly = computeExtractionProgress({
    hasPdfFile: false,
    pdfCurrentPage: 0,
    pdfTotalPages: 0,
    pdfDone: true,
    aiPct: 80,
  });
  assert.equal(rawTextOnly.pdfPct, 100);
  assert.equal(rawTextOnly.globalPct, 80);
});
