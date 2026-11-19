import test from 'node:test';
import assert from 'node:assert/strict';
import { isPureFormulaWithoutDelimiters, parseMathContent } from './mathParser';

test('preserves French prose spaces when inline LaTeX has no $ delimiters', () => {
  const input = 'Écoulement stationnaire (\\partial / \\partial t = 0)';
  const segments = parseMathContent(input, false);

  assert.equal(segments[0].type, 'text');
  assert.equal(segments[0].value, 'Écoulement stationnaire (');
  assert.equal(segments[1].type, 'inline-math');
  assert.equal(segments[1].value, '\\partial / \\partial t = 0');
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[2].value, ')');
});

test('keeps unit brackets and prose intact while extracting subscripted variables', () => {
  const input = 'Surface alaire et application numérique précise de F_z : 5 pts';
  const segments = parseMathContent(input, false);

  assert.deepEqual(segments, [
    { type: 'text', value: 'Surface alaire et application numérique précise de ' },
    { type: 'inline-math', value: 'F_z' },
    { type: 'text', value: ' : 5 pts' },
  ]);
});

test('does not turn unit bracket annotations into math formulas', () => {
  const input = 'q : Pression dynamique en Pascal [Pa = kg·m⁻¹·s⁻²], \\rho : masse volumique en [kg/m³]';
  const segments = parseMathContent(input, false);

  assert.equal(segments[0].type, 'text');
  assert.ok(segments[0].value.includes('[Pa = kg·m⁻¹·s⁻²]'));
  assert.equal(segments[1].type, 'inline-math');
  assert.equal(segments[1].value, '\\rho');
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[2].value, ' : masse volumique en [kg/m³]');
});

test('handles nested LaTeX commands inside prose sentences', () => {
  const input = '4. Isoler la vitesse littérale : v_1 = \\sqrt{\\frac{2(P_t - P_s)}{\\rho}}.';
  const segments = parseMathContent(input, false);

  assert.equal(segments[0].type, 'text');
  assert.equal(segments[0].value, '4. Isoler la vitesse littérale : ');
  assert.equal(segments[1].type, 'inline-math');
  assert.equal(segments[1].value, 'v_1 = \\sqrt{\\frac{2(P_t - P_s)}{\\rho}}');
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[2].value, '.');
});

test('normalizes bare multi-letter subscripts like I_Gz inside extracted math', () => {
  const input = 'Le moment quadratique I_Gz s\'exprime en m⁴.';
  const segments = parseMathContent(input, false);

  assert.deepEqual(segments, [
    { type: 'text', value: 'Le moment quadratique ' },
    { type: 'inline-math', value: 'I_{Gz}' },
    { type: 'text', value: ' s\'exprime en m⁴.' },
  ]);
});

test('treats pure formulas without $ delimiters as pure math', () => {
  const formula = 'P + \\frac{1}{2}\\rho v^2 + \\rho g z = \\text{Constante le long d\'une ligne de courant}';
  assert.equal(isPureFormulaWithoutDelimiters(formula), true);
  assert.deepEqual(parseMathContent(formula, true), [
    { type: 'block-math', value: formula },
  ]);
});

test('parses explicit $ and $$ delimiters accurately even across multiple blocks', () => {
  const input = 'Calcul : $$Q_m = \\rho S V_1$$ avec $V_1 = 150\\text{ m/s}$.';
  const segments = parseMathContent(input, false);

  assert.deepEqual(segments, [
    { type: 'text', value: 'Calcul : ' },
    { type: 'block-math', value: 'Q_m = \\rho S V_1' },
    { type: 'text', value: ' avec ' },
    { type: 'inline-math', value: 'V_1 = 150\\text{ m/s}' },
    { type: 'text', value: '.' },
  ]);
});

test('handles pure plain text without math symbols as a single text segment', () => {
  const input = 'Calcul rigoureux de la masse volumique rho (loi des gaz parfaits) : 3 pts';
  const segments = parseMathContent(input, false);

  assert.deepEqual(segments, [{ type: 'text', value: input }]);
});

test('stops inline math cleanly before comma prose after `= 0`', () => {
  const input = 'Fluide parfait non visqueux (\\mu = 0, aucune dissipation visqueuse)';
  const segments = parseMathContent(input, false);

  assert.deepEqual(segments, [
    { type: 'text', value: 'Fluide parfait non visqueux (' },
    { type: 'inline-math', value: '\\mu = 0' },
    { type: 'text', value: ', aucune dissipation visqueuse)' },
  ]);
});

test('parses inline Bernoulli step equation while keeping surrounding French text', () => {
  const input = '2. Écrire le théorème de Bernoulli : P_1 + 1/2 \\rho v_1^2 = P_2 (v_2 = 0 au point d\'arrêt).';
  const segments = parseMathContent(input, false);

  assert.equal(segments[0].type, 'text');
  assert.equal(segments[0].value, '2. Écrire le théorème de Bernoulli : ');
  assert.equal(segments[1].type, 'inline-math');
  assert.equal(segments[1].value, 'P_1 + 1/2 \\rho v_1^2 = P_2');
  assert.equal(segments[2].type, 'text');
  assert.equal(segments[2].value, ' (');
  assert.equal(segments[3].type, 'inline-math');
  assert.equal(segments[3].value, 'v_2 = 0');
  assert.equal(segments[4].type, 'text');
  assert.equal(segments[4].value, ' au point d\'arrêt).');
});

test('keeps numeric quiz options with units as spaced text', () => {
  assert.deepEqual(parseMathContent('v = 43.8 m/s', false), [
    { type: 'text', value: 'v = 43.8 m/s' },
  ]);
  assert.deepEqual(parseMathContent('eta = 58.5 %', false), [
    { type: 'text', value: 'eta = 58.5 %' },
  ]);
});
