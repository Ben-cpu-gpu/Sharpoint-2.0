import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL_ID,
  getCandidateModelsForProvider,
  LEGACY_LOCAL_MODEL_ID,
  LOCAL_FALLBACK_MODEL_ID,
  normalizeStoredModelId,
  normalizeStoredProvider,
  resolveFallbackChain,
} from './aiFallbackOrder';

test('default priority order puts Gemini first before awesome-free-llm-apis relays and Local', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: DEFAULT_MODEL_ID,
    configuredKeys: { gemini: true, groq: false, cerebras: false, mistral: false, openrouter: false },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.cloudOrder, ['gemini']);
  assert.deepEqual(res.configuredCloudChain, ['gemini']);
});

test('includes configured free LLM APIs (Groq, Cerebras, Mistral, OpenRouter) after Gemini', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-4-hydrogen',
    configuredKeys: {
      gemini: true,
      groq: true,
      cerebras: true,
      mistral: true,
      openrouter: true,
    },
  });

  assert.deepEqual(res.configuredCloudChain, ['gemini', 'groq', 'cerebras', 'mistral', 'openrouter']);
});

test('skips missing keys while preserving Gemini -> Groq -> Cerebras -> Mistral -> OpenRouter precedence', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-4-hydrogen',
    configuredKeys: { gemini: false, groq: true, cerebras: false, mistral: true, openrouter: true },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.configuredCloudChain, ['groq', 'mistral', 'openrouter']);
});

test('puts explicit free provider choice first unless preferGeminiFirst forces Gemini precedence', () => {
  const groqFirst = resolveFallbackChain({
    selectedProvider: 'groq',
    selectedModel: 'llama-3.3-70b-versatile',
    configuredKeys: { gemini: true, groq: true, cerebras: true },
  });
  assert.deepEqual(groqFirst.configuredCloudChain, ['groq', 'gemini', 'cerebras']);

  const geminiForced = resolveFallbackChain({
    selectedProvider: 'cerebras',
    selectedModel: 'llama-3.3-70b',
    preferGeminiFirst: true,
    configuredKeys: { gemini: true, groq: true, cerebras: true },
  });
  assert.deepEqual(geminiForced.configuredCloudChain, ['gemini', 'groq', 'cerebras']);
});

test('triggers Mode Local only as last resort via forceLocal or explicit local-fallback selection', () => {
  const forced = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: DEFAULT_MODEL_ID,
    forceLocal: true,
    configuredKeys: { gemini: true, groq: true, cerebras: true },
  });
  assert.equal(forced.shouldUseLocalImmediately, true);
  assert.deepEqual(forced.configuredCloudChain, []);

  const explicitLocal = resolveFallbackChain({
    selectedProvider: 'local',
    selectedModel: LOCAL_FALLBACK_MODEL_ID,
    configuredKeys: { gemini: true, groq: true },
  });
  assert.equal(explicitLocal.shouldUseLocalImmediately, true);
});

test('migrates legacy Claude, ChatGPT, local-priority, and old Gemini aliases cleanly back to Gemini', () => {
  assert.equal(normalizeStoredModelId(LEGACY_LOCAL_MODEL_ID), DEFAULT_MODEL_ID);
  assert.equal(normalizeStoredModelId('claude-sonnet-4-20250514'), DEFAULT_MODEL_ID);
  assert.equal(normalizeStoredModelId('gpt-4o'), DEFAULT_MODEL_ID);
  assert.equal(normalizeStoredModelId('gemini-2.0-flash'), 'gemini-4-hydrogen');
  assert.equal(normalizeStoredModelId('gemini-3.1-pro'), 'gemini-4-hydrogen');
  assert.equal(normalizeStoredModelId('gemini-2.5-pro'), 'gemini-4-hydrogen');
  assert.equal(normalizeStoredModelId('gemini-2.5-flash'), 'gemini-4-hydrogen');
  assert.equal(normalizeStoredProvider('local', LEGACY_LOCAL_MODEL_ID), 'gemini');
  assert.equal(normalizeStoredProvider('claude', 'claude-sonnet-4-20250514'), 'gemini');
  assert.equal(normalizeStoredProvider('openai', 'gpt-4o'), 'gemini');
  assert.equal(normalizeStoredProvider('local', LOCAL_FALLBACK_MODEL_ID), 'local');
  assert.equal(normalizeStoredProvider('cerebras', 'llama-3.3-70b'), 'cerebras');
  assert.equal(normalizeStoredProvider('openrouter', 'deepseek/deepseek-r1-0528:free'), 'openrouter');
});

test('getCandidateModelsForProvider cascades across backup models for each provider', () => {
  assert.deepEqual(getCandidateModelsForProvider('gemini', 'gemini-4-hydrogen'), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);
  assert.deepEqual(getCandidateModelsForProvider('groq', 'gemini-4-hydrogen'), [
    'llama-3.3-70b-versatile',
    'qwen/qwen3-32b',
    'llama-3.1-8b-instant',
  ]);
  assert.deepEqual(getCandidateModelsForProvider('openrouter', 'deepseek/deepseek-r1-0528:free'), [
    'deepseek/deepseek-r1-0528:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
  ]);
});

test('getCandidateModelsForProvider keeps gemini-4-hydrogen first even when preferLightFastModel is true while prioritizing lighter relay models', () => {
  assert.deepEqual(getCandidateModelsForProvider('gemini', 'gemini-4-hydrogen', true), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);
  assert.deepEqual(getCandidateModelsForProvider('groq', 'llama-3.3-70b-versatile', true), [
    'llama-3.1-8b-instant',
    'qwen/qwen3-32b',
    'llama-3.3-70b-versatile',
  ]);
});

