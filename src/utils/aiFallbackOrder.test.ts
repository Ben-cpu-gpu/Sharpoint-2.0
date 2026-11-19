import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL_ID,
  LEGACY_LOCAL_MODEL_ID,
  LOCAL_FALLBACK_MODEL_ID,
  normalizeStoredModelId,
  normalizeStoredProvider,
  resolveFallbackChain,
} from './aiFallbackOrder';

test('default priority order is strictly Gemini -> Claude -> OpenAI before Local', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: DEFAULT_MODEL_ID,
    configuredKeys: { gemini: true, claude: true, openai: true, groq: false, openrouter: false },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.cloudOrder, ['gemini', 'claude', 'openai']);
  assert.deepEqual(res.configuredCloudChain, ['gemini', 'claude', 'openai']);
});

test('includes Groq and OpenRouter free relays after Gemini -> Claude -> ChatGPT when configured', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-2.5-flash',
    configuredKeys: { gemini: true, claude: true, openai: true, groq: true, openrouter: true },
  });

  assert.deepEqual(res.configuredCloudChain, ['gemini', 'claude', 'openai', 'groq', 'openrouter']);
});

test('skips missing keys while preserving Gemini -> Claude -> ChatGPT precedence', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-2.5-flash',
    configuredKeys: { gemini: false, claude: true, openai: true, groq: false, openrouter: true },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.configuredCloudChain, ['claude', 'openai', 'openrouter']);
});

test('puts explicit Claude, OpenAI, or Groq choice first while still falling back across remaining cloud providers', () => {
  const claudeFirst = resolveFallbackChain({
    selectedProvider: 'claude',
    selectedModel: 'claude-sonnet-4-20250514',
    configuredKeys: { gemini: true, claude: true, openai: true },
  });
  assert.deepEqual(claudeFirst.configuredCloudChain, ['claude', 'gemini', 'openai']);

  const groqFirst = resolveFallbackChain({
    selectedProvider: 'groq',
    selectedModel: 'llama-3.3-70b-versatile',
    configuredKeys: { gemini: true, claude: true, openai: true, groq: true },
  });
  assert.deepEqual(groqFirst.configuredCloudChain, ['groq', 'gemini', 'claude', 'openai']);
});

test('triggers Mode Local only as last resort via forceLocal or explicit local-fallback selection', () => {
  const forced = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: DEFAULT_MODEL_ID,
    forceLocal: true,
    configuredKeys: { gemini: true, claude: true, openai: true },
  });
  assert.equal(forced.shouldUseLocalImmediately, true);
  assert.deepEqual(forced.configuredCloudChain, []);

  const explicitLocal = resolveFallbackChain({
    selectedProvider: 'local',
    selectedModel: LOCAL_FALLBACK_MODEL_ID,
    configuredKeys: { gemini: true, claude: true, openai: true },
  });
  assert.equal(explicitLocal.shouldUseLocalImmediately, true);
});

test('migrates legacy local-priority and legacy model aliases cleanly', () => {
  assert.equal(normalizeStoredModelId(LEGACY_LOCAL_MODEL_ID), DEFAULT_MODEL_ID);
  assert.equal(normalizeStoredModelId('gemini-2.0-flash'), 'gemini-4-hydrogen');
  assert.equal(normalizeStoredModelId('gemini-3.1-pro'), 'gemini-2.5-pro');
  assert.equal(normalizeStoredProvider('local', LEGACY_LOCAL_MODEL_ID), 'gemini');
  assert.equal(normalizeStoredProvider('local', LOCAL_FALLBACK_MODEL_ID), 'local');
  assert.equal(normalizeStoredProvider('openrouter', 'deepseek/deepseek-r1-0528:free'), 'openrouter');
});
