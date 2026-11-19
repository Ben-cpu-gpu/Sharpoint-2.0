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
    selectedModel: 'gemini-3.1-pro',
    configuredKeys: { gemini: true, claude: true, openai: true, groq: false },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.cloudOrder, ['gemini', 'claude', 'openai']);
  assert.deepEqual(res.configuredCloudChain, ['gemini', 'claude', 'openai']);
});

test('includes Groq after Gemini -> Claude -> ChatGPT when Groq key is configured', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-3-flash',
    configuredKeys: { gemini: true, claude: true, openai: true, groq: true },
  });

  assert.deepEqual(res.configuredCloudChain, ['gemini', 'claude', 'openai', 'groq']);
});

test('skips missing keys while preserving Gemini -> Claude -> ChatGPT precedence', () => {
  const res = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-3.1-pro',
    configuredKeys: { gemini: false, claude: true, openai: true, groq: false },
  });

  assert.equal(res.shouldUseLocalImmediately, false);
  assert.deepEqual(res.cloudOrder, ['gemini', 'claude', 'openai']);
  assert.deepEqual(res.configuredCloudChain, ['claude', 'openai']);
});

test('puts explicit Claude or OpenAI choice first while still falling back across remaining cloud providers', () => {
  const claudeFirst = resolveFallbackChain({
    selectedProvider: 'claude',
    selectedModel: 'claude-sonnet-5.5',
    configuredKeys: { gemini: true, claude: true, openai: true },
  });
  assert.deepEqual(claudeFirst.configuredCloudChain, ['claude', 'gemini', 'openai']);

  const openaiFirst = resolveFallbackChain({
    selectedProvider: 'openai',
    selectedModel: 'gpt-5',
    configuredKeys: { gemini: true, claude: true, openai: true },
  });
  assert.deepEqual(openaiFirst.configuredCloudChain, ['openai', 'gemini', 'claude']);
});

test('triggers Mode Local only as last resort via forceLocal or explicit local-fallback selection', () => {
  const forced = resolveFallbackChain({
    selectedProvider: 'gemini',
    selectedModel: 'gemini-3.1-pro',
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

test('migrates legacy local-priority stored selection back to Gemini priority #1', () => {
  assert.equal(normalizeStoredModelId(LEGACY_LOCAL_MODEL_ID), DEFAULT_MODEL_ID);
  assert.equal(normalizeStoredProvider('local', LEGACY_LOCAL_MODEL_ID), 'gemini');
  assert.equal(normalizeStoredProvider('local', LOCAL_FALLBACK_MODEL_ID), 'local');
  assert.equal(normalizeStoredModelId('claude-sonnet-5.5'), 'claude-sonnet-5.5');
});
