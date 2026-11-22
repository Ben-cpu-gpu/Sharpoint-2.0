import { AnnaleItem, DebugLog, ProviderHealthResult, QuizQuestion, StudySheet, TDExercise } from '../types/course';
import { addDebugLog } from './logService';
import { 
  AIProvider,
  getServerGeminiConfigured,
  setServerGeminiConfigured,
  getGroqApiKey,
  getCerebrasApiKey,
  getMistralApiKey,
  getOpenRouterApiKey,
  getSelectedModel, 
  getSelectedProvider 
} from './apiKeyService';
import {
  CloudAIProvider,
  DEFAULT_MODEL_ID,
  getCandidateModelsForProvider,
  resolveFallbackChain,
} from '../utils/aiFallbackOrder';
import { DEFAULT_SUBJECT_ID } from '../utils/courseCatalog';
import { extractJsonFromModelText } from '../utils/pdfTelemetry';
import {
  chunkDocumentByPages,
  mergeExercises,
  mergeStudySheets,
} from '../utils/documentExtraction';

export interface AIExtractionProgress {
  provider: string;
  model: string;
  aiPct: number;
  bytesReceived: number;
  stepLabel: string;
  streamedText?: string;
}

export interface AIExecutionOptions {
  signal?: AbortSignal;
  preferLightFastModel?: boolean;
  maxOutputTokens?: number;
}

export const STRICT_EXHAUSTIVENESS_RULE = `CONSIGNE DE RIGUEUR, EXHAUSTIVITÉ ET ZÉRO HALLUCINATION :
1. N'invente JAMAIS aucune constante, valeur numérique, équation, théorème ou citation absente du cours ou des lois scientifiques établies. Si une grandeur est absente du polycopié, indique-le explicitement plutôt que de l'inventer.
2. Interdiction formelle de résumer, tronquer, abréger ou utiliser "etc." / "de même pour...". Extrais 100% des théorèmes, 100% des formules, 100% des conditions strictes de validité et définis chaque variable avec son unité SI exacte.
3. Rédige toute formule mathématique en LaTeX valide compatible KaTeX (accolades fermées _{...}, ^{...}, \\frac{...}{...}).`;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error('Extraction annulée par l’utilisateur.');
    err.name = 'AbortError';
    throw err;
  }
}

function cleanJsonOutput(text: string): string {
  return extractJsonFromModelText(text);
}

function isWarmupHtmlPayload(rawText: string): boolean {
  const trimmed = (rawText || '').trim().toLowerCase();
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('starting server') ||
    trimmed.includes('__aistudio_warmup_failed')
  );
}

async function waitMs(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function resolveClientGeminiModel(modelOverride?: string): string {
  const rawModel = modelOverride || getSelectedModel();
  if (rawModel === 'gemini-4-hydrogen' || rawModel === 'gemini-3.1-flash-lite') {
    return rawModel;
  }
  return DEFAULT_MODEL_ID;
}

export async function fetchGeminiServerStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) return getServerGeminiConfigured();
    const data = await res.json();
    const configured = Boolean(data?.configured);
    setServerGeminiConfigured(configured);
    return configured;
  } catch {
    return getServerGeminiConfigured();
  }
}

/**
 * 1. APPEL GEMINI CÔTÉ SERVEUR (/api/gemini/stream avec fallback /api/gemini/generate)
 * Utilise le flux SSE avec heartbeat keepalive pour éviter les coupures proxy HTTP 502 sur Gemini 4 Hydrogen.
 */
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  onProgress?: (progress: AIExtractionProgress) => void,
  allowCascade = true,
  execOptions?: AIExecutionOptions
): Promise<{ text: string; activeModel: string }> {
  const signal = execOptions?.signal;
  throwIfAborted(signal);
  const modelName = resolveClientGeminiModel(modelOverride);
  const fullSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\n${systemPrompt}`;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    throwIfAborted(signal);
    // 1) Flux SSE prioritaire (/api/gemini/stream) avec keepalive 3s anti-502 (avec ou sans callback onProgress)
    try {
      const streamRes = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          systemPrompt: fullSystemPrompt,
          userPrompt,
          model: modelName,
          responseMimeType: 'application/json',
          cascadeModels: allowCascade,
          preferLightFastModel: Boolean(execOptions?.preferLightFastModel),
        }),
      });

      const contentType = streamRes.headers.get('content-type') || '';
      if (streamRes.ok && streamRes.body && contentType.includes('text/event-stream')) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let activeModel = modelName;
        let streamErr: { statusCode: number; message: string; rawPayload?: string } | null = null;

        while (true) {
          throwIfAborted(signal);
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.split('\n').find(l => l.startsWith('data: '));
            if (!line) continue;
            const payload = JSON.parse(line.slice(6));
            if (payload.model) activeModel = payload.model;
            if (payload.error) {
              streamErr = {
                statusCode: payload.statusCode || 502,
                message: payload.error,
                rawPayload: payload.rawPayload,
              };
              break;
            }
            if (payload.text) {
              fullText += payload.text;
              if (onProgress) {
                const estPct = Math.min(94, Math.max(18, 18 + Math.round(fullText.length / 75)));
                onProgress({
                  provider: 'Gemini (Serveur)',
                  model: activeModel,
                  aiPct: estPct,
                  bytesReceived: fullText.length,
                  stepLabel: `Génération en direct via ${activeModel} (${fullText.length} caractères reçus)...`,
                  streamedText: fullText,
                });
              }
            }
          }
          if (streamErr) break;
        }

        if (!streamErr && fullText.trim()) {
          setServerGeminiConfigured(true);
          return { text: cleanJsonOutput(fullText), activeModel };
        }
        if (streamErr?.rawPayload === 'MISSING_SERVER_GEMINI_API_KEY') {
          setServerGeminiConfigured(false);
          throw {
            provider: 'Gemini',
            model: activeModel,
            statusCode: 503,
            message: streamErr.message,
            rawPayload: streamErr.rawPayload,
          };
        }
        if (streamErr) {
          const isTransientStream =
            (streamErr.statusCode === 502 || streamErr.statusCode === 503) && attempt < maxAttempts - 1;
          if (isTransientStream) {
            onProgress?.({
              provider: 'Gemini (Serveur)',
              model: activeModel,
              aiPct: 14,
              bytesReceived: 0,
              stepLabel: `Nouvelle tentative Gemini (${attempt + 2}/${maxAttempts})...`,
            });
            await waitMs(1200 * (attempt + 1));
            continue;
          }
          throw {
            provider: 'Gemini',
            model: activeModel,
            statusCode: streamErr.statusCode,
            message: streamErr.message,
            rawPayload: streamErr.rawPayload,
          };
        }
      } else if (!streamRes.ok) {
        const maybeHtml = await streamRes.text();
        if ((streamRes.status === 502 || streamRes.status === 503 || isWarmupHtmlPayload(maybeHtml)) && attempt < maxAttempts - 1) {
          onProgress?.({
            provider: 'Gemini (Serveur)',
            model: modelName,
            aiPct: 12,
            bytesReceived: 0,
            stepLabel: `Démarrage du serveur Gemini (tentative ${attempt + 2}/${maxAttempts})...`,
          });
          await waitMs(1500 * (attempt + 1));
          continue;
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      if (err?.provider === 'Gemini' && err?.statusCode && err.statusCode !== 502 && err.statusCode !== 503) {
        throw err;
      }
      // Poursuit vers l'appel /api/gemini/generate non-stream en secours
    }

    // 2) Appel standard POST /api/gemini/generate
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemPrompt: fullSystemPrompt,
        userPrompt,
        model: modelName,
        responseMimeType: 'application/json',
        cascadeModels: allowCascade,
        preferLightFastModel: Boolean(execOptions?.preferLightFastModel),
      }),
    });

    const rawText = await response.text();
    let parsedBody: any = null;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = null;
    }

    const warmupDetected = isWarmupHtmlPayload(rawText) || response.status === 502 || response.status === 503;
    if (
      warmupDetected &&
      parsedBody?.rawPayload !== 'MISSING_SERVER_GEMINI_API_KEY' &&
      attempt < maxAttempts - 1
    ) {
      onProgress?.({
        provider: 'Gemini (Serveur)',
        model: modelName,
        aiPct: 12 + attempt * 5,
        bytesReceived: 0,
        stepLabel: `Réveil du serveur Gemini en cours (tentative ${attempt + 2}/${maxAttempts})...`,
      });
      await waitMs(1500 * (attempt + 1));
      continue;
    }

    if (!response.ok) {
      if (response.status === 503 && parsedBody?.rawPayload === 'MISSING_SERVER_GEMINI_API_KEY') {
        setServerGeminiConfigured(false);
      }
      throw {
        provider: 'Gemini',
        model: parsedBody?.model || modelName,
        statusCode: parsedBody?.statusCode || response.status,
        message: isWarmupHtmlPayload(rawText)
          ? 'Serveur en cours de démarrage (HTTP 502) — bascule vers les IA de secours.'
          : parsedBody?.error || `Erreur serveur Gemini HTTP ${response.status}`,
        rawPayload: parsedBody?.rawPayload || rawText.substring(0, 600),
      };
    }

    const candidate = parsedBody?.text;
    const resolvedModel = parsedBody?.model || modelName;
    if (!candidate) {
      throw {
        provider: 'Gemini',
        model: resolvedModel,
        statusCode: 502,
        message: isWarmupHtmlPayload(rawText)
          ? 'Le serveur redémarrait (page HTML reçue) — bascule vers les IA de secours.'
          : 'Réponse Gemini vide ou filtrée.',
        rawPayload: rawText.substring(0, 600),
      };
    }

    setServerGeminiConfigured(true);
    return { text: cleanJsonOutput(candidate), activeModel: resolvedModel };
  }

  throw {
    provider: 'Gemini',
    model: modelName,
    statusCode: 502,
    message: 'Serveur Gemini temporairement indisponible après plusieurs tentatives.',
    rawPayload: 'WARMUP_EXHAUSTED',
  };
}

export async function streamGeminiContent(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunkText: string) => void,
  modelOverride?: string
): Promise<string> {
  const modelName = resolveClientGeminiModel(modelOverride);
  const response = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: `${STRICT_EXHAUSTIVENESS_RULE}\n\n${systemPrompt}`,
      userPrompt,
      model: modelName,
    }),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(errText || `Erreur stream HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';
    for (const evt of events) {
      const line = evt.split('\n').find(l => l.startsWith('data: '));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.error) {
        throw new Error(payload.error);
      }
      if (payload.text) {
        fullText += payload.text;
        onChunk(payload.text);
      }
    }
  }

  return fullText;
}

/**
 * 2. APPEL GROQ CLOUD (awesome-free-llm-apis · Tier Gratuit Llama 3.3 / Qwen 3)
 */
async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  keyOverride?: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = keyOverride ?? getGroqApiKey();
  const GROQ_MODEL = modelOverride && (modelOverride.includes('llama') || modelOverride.includes('qwen'))
    ? modelOverride
    : 'llama-3.3-70b-versatile';

  if (!apiKey) {
    throw {
      provider: 'Groq',
      model: GROQ_MODEL,
      statusCode: 401,
      message: 'Aucune clé Groq configurée.',
      rawPayload: 'MISSING_GROQ_KEY'
    };
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const enforcedSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON valide conforme au schéma demandé.\n${systemPrompt}`;

  const payload = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: enforcedSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8192,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Groq',
      model: GROQ_MODEL,
      statusCode: response.status,
      message: `Erreur HTTP ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content;
  return cleanJsonOutput(content);
}

/**
 * 3. APPEL CEREBRAS CLOUD (awesome-free-llm-apis · 1M tokens/jour gratuits sans CB)
 */
async function callCerebras(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  keyOverride?: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = keyOverride ?? getCerebrasApiKey();
  const CEREBRAS_MODEL =
    modelOverride === 'qwen-3-32b' || modelOverride === 'llama3.1-8b' || modelOverride === 'llama-3.3-70b'
      ? modelOverride
      : 'llama-3.3-70b';

  if (!apiKey) {
    throw {
      provider: 'Cerebras',
      model: CEREBRAS_MODEL,
      statusCode: 401,
      message: 'Aucune clé Cerebras configurée.',
      rawPayload: 'MISSING_CEREBRAS_KEY'
    };
  }

  const url = 'https://api.cerebras.ai/v1/chat/completions';
  const enforcedSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON strict et valide.\n${systemPrompt}`;

  const payload = {
    model: CEREBRAS_MODEL,
    messages: [
      { role: 'system', content: enforcedSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8192,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Cerebras',
      model: CEREBRAS_MODEL,
      statusCode: response.status,
      message: `Erreur HTTP Cerebras ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw {
      provider: 'Cerebras',
      model: CEREBRAS_MODEL,
      statusCode: 200,
      message: 'Réponse Cerebras vide.',
      rawPayload: rawText
    };
  }
  return cleanJsonOutput(content);
}

/**
 * 4. APPEL MISTRAL AI (awesome-free-llm-apis · La Plateforme Experiment gratuit)
 */
async function callMistral(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  keyOverride?: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = keyOverride ?? getMistralApiKey();
  const MISTRAL_MODEL =
    modelOverride === 'open-mistral-nemo' || modelOverride === 'mistral-small-latest'
      ? modelOverride
      : 'mistral-small-latest';

  if (!apiKey) {
    throw {
      provider: 'Mistral',
      model: MISTRAL_MODEL,
      statusCode: 401,
      message: 'Aucune clé Mistral AI configurée.',
      rawPayload: 'MISSING_MISTRAL_KEY'
    };
  }

  const url = 'https://api.mistral.ai/v1/chat/completions';
  const enforcedSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON strict et valide.\n${systemPrompt}`;

  const payload = {
    model: MISTRAL_MODEL,
    messages: [
      { role: 'system', content: enforcedSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8192,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'Mistral',
      model: MISTRAL_MODEL,
      statusCode: response.status,
      message: `Erreur HTTP Mistral ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw {
      provider: 'Mistral',
      model: MISTRAL_MODEL,
      statusCode: 200,
      message: 'Réponse Mistral vide.',
      rawPayload: rawText
    };
  }
  return cleanJsonOutput(content);
}

/**
 * 5. APPEL OPENROUTER (:free officiel — awesome-free-llm-apis · Llama 3.3 / DeepSeek R1 / Gemma 3)
 */
async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  modelOverride?: string,
  keyOverride?: string,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = keyOverride ?? getOpenRouterApiKey();
  const OR_MODEL = modelOverride && modelOverride.endsWith(':free')
    ? modelOverride
    : 'meta-llama/llama-3.3-70b-instruct:free';

  if (!apiKey) {
    throw {
      provider: 'OpenRouter',
      model: OR_MODEL,
      statusCode: 401,
      message: 'Aucune clé OpenRouter configurée.',
      rawPayload: 'MISSING_OPENROUTER_KEY'
    };
  }

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const enforcedSystemPrompt = `${STRICT_EXHAUSTIVENESS_RULE}\n\nRéponds UNIQUEMENT sous la forme d'un objet JSON valide.\n${systemPrompt}`;

  const payload = {
    model: OR_MODEL,
    messages: [
      { role: 'system', content: enforcedSystemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.1,
    max_tokens: 8192,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://fichemaster.local',
      'X-Title': 'FicheMaster IA',
    },
    signal,
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw {
      provider: 'OpenRouter',
      model: OR_MODEL,
      statusCode: response.status,
      message: `Erreur HTTP OpenRouter ${response.status}: ${rawText.substring(0, 300)}`,
      rawPayload: rawText
    };
  }

  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content || '';
  return cleanJsonOutput(content);
}

const DEFAULT_PROVIDER_MODELS: Record<CloudAIProvider, string> = {
  gemini: DEFAULT_MODEL_ID,
  groq: 'llama-3.3-70b-versatile',
  cerebras: 'llama-3.3-70b',
  mistral: 'mistral-small-latest',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
};

const PROVIDER_LOG_LABELS: Record<CloudAIProvider, DebugLog['apiProvider']> = {
  gemini: 'Gemini',
  groq: 'Groq',
  cerebras: 'Cerebras',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
};

/**
 * TEST DE SANTÉ EN DIRECT D'UN FOURNISSEUR / CLÉ API
 */
export async function testProviderHealth(
  provider: AIProvider,
  overrideKey?: string,
  modelOverride?: string
): Promise<ProviderHealthResult> {
  const checkedAt = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (provider === 'local') {
    return {
      provider: 'local',
      status: 'ok',
      latencyMs: 1,
      statusCode: 200,
      testedModel: 'Regex Client-Side',
      message: 'Extraction locale hors-ligne opérationnelle (dernier recours).',
      checkedAt,
    };
  }

  const testedModel = modelOverride || DEFAULT_PROVIDER_MODELS[provider];

  if (provider === 'gemini') {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const res = await fetch('/api/gemini/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testedModel }),
      });
      const data = await res.json().catch(() => ({}));
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = data?.latencyMs || Math.max(1, Math.round(endTime - startTime));

      if (!res.ok || !data?.ok) {
        const statusCode = data?.statusCode || res.status;
        if (statusCode === 503 && data?.rawPayload === 'MISSING_SERVER_GEMINI_API_KEY') {
          setServerGeminiConfigured(false);
        }
        const message = data?.error || `Erreur serveur Gemini HTTP ${statusCode}`;
        addDebugLog({
          apiProvider: 'Gemini',
          model: data?.model || testedModel,
          status: 'error',
          statusCode,
          message: `Échec test santé : ${message}`,
          rawPayload: data?.rawPayload,
        });
        return {
          provider: 'gemini',
          status: statusCode === 503 && data?.rawPayload === 'MISSING_SERVER_GEMINI_API_KEY' ? 'missing' : 'error',
          latencyMs,
          statusCode,
          testedModel: data?.model || testedModel,
          message,
          checkedAt,
        };
      }

      setServerGeminiConfigured(true);
      addDebugLog({
        apiProvider: 'Gemini',
        model: data.model || testedModel,
        status: 'success',
        statusCode: 200,
        message: `Test de santé serveur Gemini réussi en ${latencyMs} ms (${data.model || testedModel}).`,
      });
      return {
        provider: 'gemini',
        status: 'ok',
        latencyMs,
        statusCode: 200,
        testedModel: data.model || testedModel,
        message: `Connexion serveur validée en ${latencyMs} ms`,
        checkedAt,
      };
    } catch (err: any) {
      const message = err?.message || 'Serveur Gemini inaccessible.';
      addDebugLog({
        apiProvider: 'Gemini',
        model: testedModel,
        status: 'error',
        statusCode: 0,
        message: `Échec test santé : ${message}`,
      });
      return {
        provider: 'gemini',
        status: 'error',
        statusCode: 0,
        testedModel,
        message,
        checkedAt,
      };
    }
  }

  const key =
    overrideKey !== undefined
      ? overrideKey.trim()
      : provider === 'groq'
      ? getGroqApiKey()
      : provider === 'cerebras'
      ? getCerebrasApiKey()
      : provider === 'mistral'
      ? getMistralApiKey()
      : getOpenRouterApiKey();

  if (!key) {
    return {
      provider,
      status: 'missing',
      testedModel,
      message: 'Aucune clé API configurée pour ce fournisseur.',
      checkedAt,
    };
  }

  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const sysProbe = 'Réponds strictement par l\'objet JSON {"ok":true}.';
  const usrProbe = 'Test de connectivité API.';

  try {
    if (provider === 'groq') {
      await callGroq(sysProbe, usrProbe, testedModel, key);
    } else if (provider === 'cerebras') {
      await callCerebras(sysProbe, usrProbe, testedModel, key);
    } else if (provider === 'mistral') {
      await callMistral(sysProbe, usrProbe, testedModel, key);
    } else {
      await callOpenRouter(sysProbe, usrProbe, testedModel, key);
    }

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endTime - startTime));

    addDebugLog({
      apiProvider: PROVIDER_LOG_LABELS[provider],
      model: testedModel,
      status: 'success',
      statusCode: 200,
      message: `Test de santé réussi en ${latencyMs} ms (${testedModel}).`,
    });

    return {
      provider,
      status: 'ok',
      latencyMs,
      statusCode: 200,
      testedModel,
      message: `Connexion validée en ${latencyMs} ms`,
      checkedAt,
    };
  } catch (err: any) {
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const latencyMs = Math.max(1, Math.round(endTime - startTime));
    const code = err?.statusCode || 0;
    const detail =
      code === 401 || code === 403
        ? `Clé API refusée ou invalide (HTTP ${code})`
        : code === 429
        ? 'Quota ou débit limite atteint (HTTP 429)'
        : code === 404
        ? `Modèle introuvable sur l'API (HTTP 404)`
        : err?.message || 'Erreur réseau ou CORS';

    addDebugLog({
      apiProvider: PROVIDER_LOG_LABELS[provider],
      model: testedModel,
      status: 'error',
      statusCode: code,
      message: `Échec test santé : ${detail}`,
      rawPayload: err?.rawPayload,
    });

    return {
      provider,
      status: 'error',
      latencyMs,
      statusCode: code,
      testedModel,
      message: detail,
      checkedAt,
    };
  }
}

/**
 * ROUTEUR MULTI-MODÈLES EXHAUSTIF :
 * 1. Gemini (tous modèles valides + réveil auto)
 * 2. Toutes les API gratuites configurées (Groq -> Cerebras -> Mistral -> OpenRouter :free) et tous leurs modèles disponibles
 * 3. Mode Local uniquement en dernier recours après consentement explicite
 */
export async function executeWithFallback<T>(
  systemPrompt: string,
  userPrompt: string,
  validator: (parsed: any) => T,
  forceLocal?: boolean,
  localFallbackFn?: () => T,
  onProgress?: (progress: AIExtractionProgress) => void,
  execOptions?: AIExecutionOptions
): Promise<T> {
  const signal = execOptions?.signal;
  throwIfAborted(signal);

  const selectedProvider = getSelectedProvider();
  const selectedModel = getSelectedModel();

  let geminiAvailable = getServerGeminiConfigured();
  if (!geminiAvailable && !forceLocal) {
    geminiAvailable = await fetchGeminiServerStatus();
  }

  const resolution = resolveFallbackChain({
    selectedProvider,
    selectedModel,
    forceLocal,
    configuredKeys: {
      gemini: geminiAvailable,
      groq: getGroqApiKey().length > 0,
      cerebras: getCerebrasApiKey().length > 0,
      mistral: getMistralApiKey().length > 0,
      openrouter: getOpenRouterApiKey().length > 0,
    },
  });

  if (resolution.shouldUseLocalImmediately && localFallbackFn) {
    onProgress?.({
      provider: 'Mode Local',
      model: 'Regex Client-Side',
      aiPct: 100,
      bytesReceived: userPrompt.length,
      stepLabel: 'Extraction locale terminée dans le navigateur.',
    });
    addDebugLog({
      apiProvider: 'Local',
      model: 'Moteur Regex Client-Side (Dernier recours Offline)',
      status: 'success',
      statusCode: 200,
      message: 'Extraction locale de dernier recours exécutée dans le navigateur.',
    });
    return localFallbackFn();
  }

  const attemptErrors: string[] = [];
  const totalProviders = Math.max(1, resolution.configuredCloudChain.length);

  for (let pIdx = 0; pIdx < resolution.configuredCloudChain.length; pIdx++) {
    throwIfAborted(signal);
    const currentProvider = resolution.configuredCloudChain[pIdx];
    const providerLabel = PROVIDER_LOG_LABELS[currentProvider];

    // Pour Gemini, /api/gemini/generate et /api/gemini/stream cascadent déjà tous les modèles valides côté serveur ;
    // pour les autres API (Groq, Cerebras, Mistral, OpenRouter), on parcourt chaque modèle candidat si l'un est indisponible/404/quota.
    const candidateModels =
      currentProvider === 'gemini'
        ? [
            currentProvider === selectedProvider
              ? selectedModel
              : DEFAULT_PROVIDER_MODELS.gemini,
          ]
        : getCandidateModelsForProvider(
            currentProvider,
            currentProvider === selectedProvider ? selectedModel : undefined,
            Boolean(execOptions?.preferLightFastModel)
          );

    for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
      throwIfAborted(signal);
      const modelToUse = candidateModels[mIdx];
      const basePct = Math.min(82, 10 + Math.round(((pIdx * 2 + mIdx) / Math.max(2, totalProviders * 2)) * 55));

      onProgress?.({
        provider: providerLabel,
        model: modelToUse,
        aiPct: basePct,
        bytesReceived: 0,
        stepLabel: `Analyse via ${providerLabel} (${modelToUse})...`,
      });

      try {
        let rawResult = '';
        let resolvedModelName = modelToUse;

        if (currentProvider === 'gemini') {
          const geminiOut = await callGemini(systemPrompt, userPrompt, modelToUse, onProgress, true, execOptions);
          rawResult = geminiOut.text;
          resolvedModelName = geminiOut.activeModel;
        } else if (currentProvider === 'groq') {
          rawResult = await callGroq(systemPrompt, userPrompt, modelToUse, undefined, signal);
        } else if (currentProvider === 'cerebras') {
          rawResult = await callCerebras(systemPrompt, userPrompt, modelToUse, undefined, signal);
        } else if (currentProvider === 'mistral') {
          rawResult = await callMistral(systemPrompt, userPrompt, modelToUse, undefined, signal);
        } else {
          rawResult = await callOpenRouter(systemPrompt, userPrompt, modelToUse, undefined, signal);
        }

        const parsed = JSON.parse(cleanJsonOutput(rawResult));
        const validated = validator(parsed);

        onProgress?.({
          provider: providerLabel,
          model: resolvedModelName,
          aiPct: 100,
          bytesReceived: rawResult.length,
          stepLabel: `Structuration réussie avec ${providerLabel} (${resolvedModelName}).`,
          streamedText: rawResult,
        });

        addDebugLog({
          apiProvider: providerLabel,
          model: resolvedModelName,
          status: 'success',
          statusCode: 200,
          message: `Génération réussie via ${providerLabel} (${resolvedModelName}).`,
          rawPayload: rawResult.substring(0, 500),
        });

        return validated;
      } catch (providerError: any) {
        if (providerError?.name === 'AbortError' || signal?.aborted) {
          throw providerError;
        }
        const failedModel = providerError?.model || modelToUse;
        const statusCode = providerError?.statusCode || 0;
        const msg = providerError?.message || `Échec sur ${failedModel}`;
        attemptErrors.push(`${providerLabel} (${failedModel}) : ${msg}`);

        addDebugLog({
          apiProvider: (providerError?.provider || providerLabel) as DebugLog['apiProvider'],
          model: failedModel,
          status: 'error',
          statusCode,
          message: `${msg} — bascule automatique vers le modèle/fournisseur suivant...`,
          rawPayload: providerError?.rawPayload || JSON.stringify(providerError),
        });

        // Si clé API invalide/refusée (401/403), inutile d'essayer les autres modèles du même fournisseur
        if (statusCode === 401 || statusCode === 403 || providerError?.rawPayload === 'MISSING_SERVER_GEMINI_API_KEY') {
          break;
        }
      }
    }
  }

  if (localFallbackFn) {
    const err = new Error('REQUIRE_USER_CONSENT') as Error & { details?: string[] };
    err.details = attemptErrors;
    throw err;
  }

  throw new Error(
    attemptErrors.length > 0
      ? `Toutes les IA disponibles ont échoué : ${attemptErrors.slice(0, 3).join(' | ')}`
      : 'Aucun service IA disponible. Vérifiez Gemini ou ajoutez une clé gratuite (Groq, Cerebras, Mistral, OpenRouter).'
  );
}

// ------------------------------------------------------------------------------------------------
// EXTRACTIONS LOCALES (Regex heuristiques 100% Client-Side)
// ------------------------------------------------------------------------------------------------

function localExtractToolbox(text: string, subjectId = DEFAULT_SUBJECT_ID): StudySheet {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0]?.substring(0, 80) || 'Fiche de Cours (Extraction Locale)';
  
  const formulaMatches: Array<{ formula: string; name: string }> = [];
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+)\$|([A-Za-z\s]+=\s*[^;\.\n]+)/g;
  let match;
  let count = 0;
  while ((match = mathRegex.exec(text)) !== null && count < 10) {
    const rawForm = (match[1] || match[2] || match[3] || '').trim();
    if (rawForm.length > 3 && rawForm.includes('=')) {
      count++;
      formulaMatches.push({
        name: `Relation caractéristique #${count}`,
        formula: rawForm,
      });
    }
  }

  return {
    id: `sheet_${Date.now()}`,
    subjectId,
    title: title,
    subtitle: 'Généré en Mode Local (Dernier recours Offline)',
    chapter: 'Extraction Automatique',
    tags: ['Mode Local', 'ESTACA'],
    mastery: 'to_learn',
    theorems: [
      {
        id: `thm_${Date.now()}_1`,
        name: 'Principe fondamental extrait du document',
        statement: 'Voir les équations caractéristiques extraites du document source.',
        strictConditions: [
          'Vérifier les conditions aux limites dans le document de cours',
          'Régime permanent ou stationnaire requis',
        ],
        professorTip: 'Toujours réécrire les hypothèses de base sur la copie d\'examen ESTACA.',
      }
    ],
    magicFormulas: formulaMatches.length > 0 ? formulaMatches.map((f, idx) => ({
      id: `fml_${Date.now()}_${idx}`,
      name: f.name,
      formula: f.formula,
      unitsAndVariables: 'Toutes les variables sont à exprimer en unités du Système International (SI).',
      validityDomain: 'Consulter le support de cours pour le domaine de validité précis.',
    })) : [
      {
        id: `fml_${Date.now()}_default`,
        name: 'Équation fondamentale',
        formula: 'F = m \\cdot a',
        unitsAndVariables: 'F en Newtons [N], m en kilogrammes [kg], a en m/s²',
        validityDomain: 'Mécanique newtonienne non relativiste',
      }
    ],
    stepByStepMethods: [
      {
        id: `mth_${Date.now()}_1`,
        goal: 'Résolution méthodique d\'un problème issu de ce cours',
        steps: [
          '1. Définir le système fermé/ouvert et le référentiel d\'étude.',
          '2. Poser le bilan exhaustif des forces ou des flux.',
          '3. Écrire les équations maîtresses avec les hypothèses associées.',
          '4. Résoudre analytiquement avant de faire l\'application numérique.',
          '5. Vérifier l\'homogénéité dimensionnelle et la cohérence des ordres de grandeur.',
        ],
        trapToAvoid: 'Ne jamais faire l\'application numérique avant d\'avoir isolé l\'expression littérale.',
      }
    ],
    examTraps: [
      'Oubli de convertir les unités en unités SI (ex: bar en Pa, km/h en m/s, °C en Kelvin).',
      'Application d\'une formule hors de son domaine de validité sans citer les hypothèses.',
    ],
    flashcards: [
      {
        id: `fc_${Date.now()}_1`,
        question: 'Quelle est la première étape indispensable avant toute application numérique ?',
        answer: 'Établir l\'expression littérale exacte et vérifier l\'homogénéité dimensionnelle.',
      },
      {
        id: `fc_${Date.now()}_2`,
        question: 'Quelles sont les unités SI de la pression et de l\'énergie ?',
        answer: 'Pression en Pascal (Pa = N/m² ou kg·m⁻¹·s⁻²), Énergie en Joules (J = N·m ou kg·m²·s⁻²).',
      }
    ],
    quiz: [
      {
        id: `qz_${Date.now()}_1`,
        question: 'Pour une démarche d\'ingénieur rigoureuse, que faut-il obligatoirement mentionner avant de poser un théorème ?',
        options: [
          'La date de découverte du théorème',
          'Toutes les hypothèses strictes de validité',
          'Le numéro de page du polycopié',
          'La valeur numérique finale attendue'
        ],
        correctIndex: 1,
        explanation: 'En école d\'ingénieurs type ESTACA, un théorème posé sans ses hypothèses de validité perd la majorité des points au barème.',
      }
    ],
  };
}

function localParseTd(text: string, type: 'td' | 'annale', subjectId = DEFAULT_SUBJECT_ID): Array<TDExercise | AnnaleItem> {
  const chunks = text.split(/(?:Exercice|Problème|Partie|Exercice\s*\d+|EXERCICE)/i).filter(c => c.trim().length > 20);
  if (chunks.length === 0) chunks.push(text);

  return chunks.map((chunk, idx) => {
    const lines = chunk.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0]?.substring(0, 60) || `Exercice ${idx + 1}`;
    const statement = lines.slice(1, 10).join('\n') || chunk.substring(0, 300);

    const base: TDExercise = {
      id: `exo_${Date.now()}_${idx}`,
      subjectId,
      chapter: 'Chapitre Extrait',
      title: title,
      notion: 'Application des lois fondamentales',
      difficulty: ((idx % 3) + 1) as 1 | 2 | 3,
      statement: statement,
      hints: [
        'Commencez par schématiser le problème et poser les axes.',
        'Isolez la grandeur recherchée sous forme littérale.',
      ],
      solution: `Correction pas à pas :\n1. Bilan des hypothèses appliquées.\n2. Écriture des équations de conservation.\n3. Résolution littérale et simplification.\n4. Application numérique avec unités SI.`,
      status: 'todo',
    };

    if (type === 'annale') {
      const annale: AnnaleItem = {
        ...base,
        session: 'Session Principale',
        year: new Date().getFullYear(),
        durationMinutes: 120,
        points: 20,
        gradingCriteria: [
          'Qualité de la démarche littérale : 8 pts',
          'Vérification des hypothèses : 4 pts',
          'Précision des calculs et unités SI : 5 pts',
          'Esprit critique sur le résultat : 3 pts',
        ],
      };
      return annale;
    }

    return base;
  });
}

// ------------------------------------------------------------------------------------------------
// FONCTIONS PUBLIQUES
// ------------------------------------------------------------------------------------------------

export async function transformLectureToToolbox(
  text: string,
  forceLocal?: boolean,
  subjectId = DEFAULT_SUBJECT_ID,
  onProgress?: (progress: AIExtractionProgress) => void,
  signal?: AbortSignal
): Promise<StudySheet> {
  throwIfAborted(signal);
  const chunks = chunkDocumentByPages(text, 20000);
  const effectiveChunks = chunks.length > 0 ? chunks : [text];

  const systemPrompt = `Tu es un professeur émérite d'école d'ingénieurs aéronautique et automobile (type ESTACA).
Transforme le cours fourni en une boîte à outils de révision ULTRA-COMPLÈTE et FIDÈLE AU DOCUMENT au format JSON.

RÈGLES ANTI-HALLUCINATION ET D'EXHAUSTIVITÉ :
- N'invente AUCUNE donnée, valeur numérique, constante ou formule absente du texte source.
- Couvre la totalité du segment fourni : extrais TOUS les théorèmes/principes (avec toutes leurs conditions strictes), TOUTES les formules clés (avec toutes les variables et unités SI), les méthodes de résolution complètes étape par étape, les pièges classiques d'examen, au moins 5 flashcards précises et au moins 4 questions de QCM calculatoires/conceptuelles (s'appuyant uniquement sur le contenu fourni).

Structure JSON attendue :
{
  "title": string,
  "subtitle": string,
  "chapter": string,
  "tags": string[],
  "theorems": [
    {
      "name": string,
      "statement": string (formule LaTeX entre $$...$$ ou $...$),
      "strictConditions": string[] (toutes les hypothèses indispensables sans exception),
      "professorTip": string (astuce d'examen tirée du cours)
    }
  ],
  "magicFormulas": [
    {
      "name": string,
      "formula": string (LaTeX),
      "unitsAndVariables": string (chaque variable définie avec son symbole et son unité SI exacte [m, kg, s, Pa, N, J, W, etc.]),
      "validityDomain": string
    }
  ],
  "stepByStepMethods": [
    {
      "goal": string,
      "steps": string[],
      "trapToAvoid": string
    }
  ],
  "examTraps": string[],
  "flashcards": [
    { "question": string, "answer": string }
  ],
  "quiz": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number (0 à 3),
      "explanation": string
    }
  ]
}`;

  const mapParsedSheet = (parsed: any, suffix: string): StudySheet => ({
    id: `sheet_${Date.now()}${suffix}`,
    subjectId,
    title: parsed.title || 'Fiche de Révision',
    subtitle: parsed.subtitle || 'Synthèse complète et rigoureuse',
    chapter: parsed.chapter || 'Généralités',
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['Ingénierie', 'ESTACA'],
    mastery: 'to_learn',
    theorems: (parsed.theorems || []).map((t: any, i: number) => ({
      id: `thm_${Date.now()}_${suffix}_${i}`,
      name: t.name || 'Théorème',
      statement: t.statement || '',
      strictConditions: Array.isArray(t.strictConditions) ? t.strictConditions : [t.strictConditions || ''],
      professorTip: t.professorTip,
    })),
    magicFormulas: (parsed.magicFormulas || []).map((f: any, i: number) => ({
      id: `fml_${Date.now()}_${suffix}_${i}`,
      name: f.name || 'Formule',
      formula: f.formula || '',
      unitsAndVariables: f.unitsAndVariables || '',
      validityDomain: f.validityDomain || '',
    })),
    stepByStepMethods: (parsed.stepByStepMethods || []).map((m: any, i: number) => ({
      id: `mth_${Date.now()}_${suffix}_${i}`,
      goal: m.goal || 'Méthode',
      steps: Array.isArray(m.steps) ? m.steps : [m.steps || ''],
      trapToAvoid: m.trapToAvoid,
    })),
    examTraps: Array.isArray(parsed.examTraps) ? parsed.examTraps : [],
    flashcards: (parsed.flashcards || []).map((fc: any, i: number) => ({
      id: `fc_${Date.now()}_${suffix}_${i}`,
      question: fc.question || '',
      answer: fc.answer || '',
    })),
    quiz: (parsed.quiz || []).map((q: any, i: number) => ({
      id: `qz_${Date.now()}_${suffix}_${i}`,
      question: q.question || '',
      options: (q.options && q.options.length === 4) ? q.options : ['A', 'B', 'C', 'D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || '',
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (forceLocal || effectiveChunks.length === 1) {
    const userPrompt = `Voici le cours d'ingénierie à analyser intégralement :\n\n${effectiveChunks[0]}`;
    return executeWithFallback<StudySheet>(
      systemPrompt,
      userPrompt,
      (parsed) => mapParsedSheet(parsed, ''),
      forceLocal,
      () => localExtractToolbox(text, subjectId),
      onProgress,
      { signal }
    );
  }

  const partialSheets: StudySheet[] = [];
  for (let idx = 0; idx < effectiveChunks.length; idx++) {
    throwIfAborted(signal);
    const segmentLabel = `Segment ${idx + 1}/${effectiveChunks.length}`;
    const userPrompt = `Voici le ${segmentLabel} du cours d'ingénierie à analyser intégralement sans rien omettre :\n\n${effectiveChunks[idx]}`;
    const sheetPart = await executeWithFallback<StudySheet>(
      systemPrompt,
      userPrompt,
      (parsed) => mapParsedSheet(parsed, `_p${idx}`),
      false,
      () => localExtractToolbox(effectiveChunks[idx], subjectId),
      prog => {
        if (!onProgress) return;
        const scaledPct = Math.round(((idx + prog.aiPct / 100) / effectiveChunks.length) * 100);
        onProgress({
          ...prog,
          aiPct: Math.min(99, Math.max(5, scaledPct)),
          stepLabel: `${segmentLabel} — ${prog.stepLabel}`,
        });
      },
      { signal }
    );
    partialSheets.push(sheetPart);
  }

  const merged = mergeStudySheets(partialSheets, subjectId);
  onProgress?.({
    provider: 'Synthèse Multi-Segments',
    model: `${effectiveChunks.length} segments fusionnés`,
    aiPct: 100,
    bytesReceived: text.length,
    stepLabel: `Fiche complète générée (${merged.theorems.length} théorèmes, ${merged.magicFormulas.length} formules).`,
  });
  return merged;
}

export async function parseTdDocument(
  text: string,
  type: 'td' | 'annale',
  forceLocal?: boolean,
  subjectId = DEFAULT_SUBJECT_ID,
  onProgress?: (progress: AIExtractionProgress) => void,
  signal?: AbortSignal
): Promise<Array<TDExercise | AnnaleItem>> {
  throwIfAborted(signal);
  const isAnnale = type === 'annale';
  const chunks = chunkDocumentByPages(text, 20000);
  const effectiveChunks = chunks.length > 0 ? chunks : [text];

  const systemPrompt = `Tu es un correcteur officiel d'épreuves d'école d'ingénieurs (ESTACA).
Analyse le document fourni (${isAnnale ? "Sujet d'annale d'examen" : "Feuille de TD"}).
RÈGLE ANTI-HALLUCINATION : conserve fidèlement les énoncés, données et grandeurs du document sans inventer de valeurs numériques absentes.
Découpe rigoureusement CHAQUE exercice ou problème présent dans ce segment et fournis une solution ultra-détaillée avec tous les calculs intermédiaires, vérifications dimensionnelles, formules LaTeX valides, indices et barème.

Format JSON attendu :
{
  "exercises": [
    {
      "title": string,
      "chapter": string,
      "notion": string,
      "difficulty": number (1, 2 ou 3),
      "statement": string,
      "hints": string[],
      "solution": string,
      ${isAnnale ? `
      "session": string,
      "year": number,
      "durationMinutes": number,
      "points": number,
      "gradingCriteria": string[]
      ` : ''}
    }
  ]
}`;

  const mapParsedItems = (parsed: any, suffix: string): Array<TDExercise | AnnaleItem> => {
    const list = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
    return list.map((item: any, i: number) => {
      const base: TDExercise = {
        id: `exo_${Date.now()}_${suffix}_${i}`,
        subjectId,
        chapter: item.chapter || 'Chapitre Général',
        title: item.title || `Exercice ${i + 1}`,
        notion: item.notion || 'Notion clé',
        difficulty: [1, 2, 3].includes(item.difficulty) ? item.difficulty : 2,
        statement: item.statement || '',
        hints: Array.isArray(item.hints) ? item.hints : [],
        solution: item.solution || 'Solution en cours de rédaction.',
        status: 'todo',
        createdAt: new Date().toISOString(),
      };

      if (isAnnale) {
        const annale: AnnaleItem = {
          ...base,
          session: item.session || 'Session Principale',
          year: item.year || new Date().getFullYear(),
          durationMinutes: item.durationMinutes || 120,
          points: item.points || 20,
          gradingCriteria: Array.isArray(item.gradingCriteria) ? item.gradingCriteria : [
            'Rigueur littérale : 50%',
            'Unités SI : 30%',
            'Esprit critique : 20%'
          ],
        };
        return annale;
      }
      return base;
    });
  };

  if (forceLocal || effectiveChunks.length === 1) {
    const userPrompt = `Voici le document à découper et corriger intégralement :\n\n${effectiveChunks[0]}`;
    return executeWithFallback<Array<TDExercise | AnnaleItem>>(
      systemPrompt,
      userPrompt,
      (parsed) => mapParsedItems(parsed, 's0'),
      forceLocal,
      () => localParseTd(text, type, subjectId),
      onProgress,
      { signal }
    );
  }

  const allLists: Array<Array<TDExercise | AnnaleItem>> = [];
  for (let idx = 0; idx < effectiveChunks.length; idx++) {
    throwIfAborted(signal);
    const segmentLabel = `Segment ${idx + 1}/${effectiveChunks.length}`;
    const userPrompt = `Voici le ${segmentLabel} du document à découper et corriger intégralement :\n\n${effectiveChunks[idx]}`;
    const part = await executeWithFallback<Array<TDExercise | AnnaleItem>>(
      systemPrompt,
      userPrompt,
      (parsed) => mapParsedItems(parsed, `p${idx}`),
      false,
      () => localParseTd(effectiveChunks[idx], type, subjectId),
      prog => {
        if (!onProgress) return;
        const scaledPct = Math.round(((idx + prog.aiPct / 100) / effectiveChunks.length) * 100);
        onProgress({
          ...prog,
          aiPct: Math.min(99, Math.max(5, scaledPct)),
          stepLabel: `${segmentLabel} — ${prog.stepLabel}`,
        });
      },
      { signal }
    );
    allLists.push(part);
  }

  const merged = mergeExercises(allLists);
  onProgress?.({
    provider: 'Synthèse Multi-Segments',
    model: `${effectiveChunks.length} segments fusionnés`,
    aiPct: 100,
    bytesReceived: text.length,
    stepLabel: `${merged.length} élément(s) complet(s) extrait(s) et corrigé(s).`,
  });
  return merged;
}

export async function generateSimilarExercise(
  exercise: TDExercise | AnnaleItem,
  type: 'td' | 'annale'
): Promise<TDExercise | AnnaleItem> {
  const isAnnale = type === 'annale';

  const systemPrompt = `Tu es un professeur d'école d'ingénieurs créant un clone d'exercice d'entraînement d'un niveau équivalent.
Prends l'exercice fourni, conserve la même structure conceptuelle mais change le contexte d'application ou les valeurs numériques.
Génère la correction complète pas à pas.

Format JSON attendu :
{
  "title": string,
  "chapter": string,
  "notion": string,
  "difficulty": number (1, 2 ou 3),
  "statement": string,
  "hints": string[],
  "solution": string,
  ${isAnnale ? `
  "session": string,
  "year": number,
  "durationMinutes": number,
  "points": number,
  "gradingCriteria": string[]
  ` : ''}
}`;

  const userPrompt = `Exercice original :\nTitre : ${exercise.title}\nNotion : ${exercise.notion}\nÉnoncé :\n${exercise.statement}\nSolution d'origine :\n${exercise.solution}`;

  return executeWithFallback<TDExercise | AnnaleItem>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const base: TDExercise = {
        id: `exo_sim_${Date.now()}`,
        subjectId: exercise.subjectId,
        chapter: parsed.chapter || exercise.chapter,
        title: parsed.title ? `[Variante IA] ${parsed.title}` : `[Variante IA] ${exercise.title}`,
        notion: parsed.notion || exercise.notion,
        difficulty: [1, 2, 3].includes(parsed.difficulty) ? parsed.difficulty : exercise.difficulty,
        statement: parsed.statement || 'Nouvel énoncé généré.',
        hints: Array.isArray(parsed.hints) ? parsed.hints : exercise.hints,
        solution: parsed.solution || 'Correction détaillée générée.',
        status: 'todo',
        createdAt: new Date().toISOString(),
      };

      if (isAnnale) {
        const annaleOriginal = exercise as AnnaleItem;
        const annale: AnnaleItem = {
          ...base,
          session: parsed.session || `Entraînement ${annaleOriginal.session}`,
          year: parsed.year || annaleOriginal.year,
          durationMinutes: parsed.durationMinutes || annaleOriginal.durationMinutes,
          points: parsed.points || annaleOriginal.points,
          gradingCriteria: Array.isArray(parsed.gradingCriteria) ? parsed.gradingCriteria : annaleOriginal.gradingCriteria,
        };
        return annale;
      }
      return base;
    }
  );
}

export async function generateNotion(
  type: 'theorem' | 'formula' | 'method' | 'trap',
  prompt: string,
  sheetContext: string
): Promise<any> {
  const systemPrompt = `Tu es un professeur d'école d'ingénieurs (ESTACA).
Génère un élément ultra-précis pour enrichir une fiche de cours au format JSON.
Type demandé : "${type}".`;

  const userPrompt = `Contexte de la fiche : ${sheetContext}\nDemande spécifique : ${prompt}`;

  return executeWithFallback<any>(
    systemPrompt,
    userPrompt,
    (parsed) => parsed
  );
}

export async function generateQuiz(sheetContext: string): Promise<QuizQuestion[]> {
  const systemPrompt = `Tu es un examinateur en école d'ingénieurs.
Génère exactement 4 questions de QCM au format JSON avec calculs ou réflexes d'examen sur la base du cours fourni.

Format JSON attendu :
{
  "quiz": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number (0 à 3),
      "explanation": string
    }
  ]
}`;

  const userPrompt = `Contexte du cours :\n${sheetContext.substring(0, 8000)}`;

  return executeWithFallback<QuizQuestion[]>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const list = parsed.quiz || (Array.isArray(parsed) ? parsed : []);
      return list.map((q: any, i: number) => ({
        id: `qz_gen_${Date.now()}_${i}`,
        question: q.question || 'Question de cours',
        options: (q.options && q.options.length === 4) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.explanation || 'Explication détaillée.',
      }));
    }
  );
}

export interface PracticeBatchParams {
  type: 'td' | 'annale';
  count: number;
  subjectId: string;
  subjectName: string;
  difficulty: 1 | 2 | 3 | 'mixed';
  topicPrompt: string;
  sourceSheet?: StudySheet;
  forceLocal?: boolean;
  onProgress?: (progress: AIExtractionProgress) => void;
  signal?: AbortSignal;
}

function localBuildPracticeBatch(params: PracticeBatchParams): Array<TDExercise | AnnaleItem> {
  const { type, count, subjectId, subjectName, difficulty, topicPrompt, sourceSheet } = params;
  const isAnnale = type === 'annale';
  const formulas = sourceSheet?.magicFormulas || [];
  const theorems = sourceSheet?.theorems || [];
  const items: Array<TDExercise | AnnaleItem> = [];
  const safeCount = Math.max(1, Math.min(8, count));

  for (let i = 0; i < safeCount; i++) {
    const fml = formulas[i % Math.max(1, formulas.length)];
    const thm = theorems[i % Math.max(1, theorems.length)];
    const diff: 1 | 2 | 3 = difficulty === 'mixed' ? (((i % 3) + 1) as 1 | 2 | 3) : difficulty;
    const baseTopic = topicPrompt.trim() || sourceSheet?.chapter || subjectName;
    const formulaText = fml ? `$$${fml.formula}$$` : 'les lois de conservation appropriées';

    const base: TDExercise = {
      id: `exo_batch_${Date.now()}_${i}`,
      subjectId,
      chapter: sourceSheet?.chapter || baseTopic,
      title: isAnnale
        ? `Problème ${i + 1} · ${fml?.name || baseTopic}`
        : `Exercice ${i + 1} · ${fml?.name || baseTopic}`,
      notion: thm?.name || fml?.name || baseTopic,
      difficulty: diff,
      statement: `Application guidée (${subjectName} — ${baseTopic}).\n1. Rappeler les hypothèses strictes de validité${thm ? ` de « ${thm.name} »` : ''}.\n2. Établir l'expression littérale à partir de ${formulaText}.\n3. Vérifier l'homogénéité dimensionnelle en unités SI.`,
      hints: [
        thm?.strictConditions?.[0]
          ? `Vérifier d'abord l'hypothèse : ${thm.strictConditions[0]}.`
          : 'Définir le système d’étude, le référentiel et les hypothèses de régime.',
        fml?.unitsAndVariables
          ? `Attention aux unités SI : ${fml.unitsAndVariables}.`
          : 'Isoler l’inconnue littéralement avant toute application numérique.',
      ],
      solution: `Correction pas à pas :\n1. **Hypothèses** : ${thm?.strictConditions?.join(' ; ') || 'Régime permanent, référentiel galiléen, unités SI.'}\n2. **Relation maîtresse** : ${formulaText}\n3. **Explication physique** : ${fml?.validityDomain || 'Valide dans le domaine d’étude précisé au cours.'}\n4. **Contrôle dimensionnel** : Vérifier que chaque membre possède la même dimension SI.`,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    if (isAnnale) {
      const annale: AnnaleItem = {
        ...base,
        session: `Entraînement ${subjectName}`,
        year: new Date().getFullYear(),
        durationMinutes: diff === 3 ? 90 : diff === 2 ? 60 : 45,
        points: 20,
        gradingCriteria: [
          'Rappel rigoureux des hypothèses de validité : 4 pts',
          'Développement littéral complet et formule exacte : 8 pts',
          'Homogénéité dimensionnelle et unités SI : 4 pts',
          'Commentaire physique et esprit critique : 4 pts',
        ],
      };
      items.push(annale);
    } else {
      items.push(base);
    }
  }

  return items;
}

/**
 * Génère un lot complet d'exercices de TD ou d'annales avec corrections détaillées et explications pédagogiques
 * en privilégiant Gemini 4 Hydrogen (mode Thinking LOW rapide) et Flash-Lite / relais gratuits en secours.
 */
export async function generatePracticeBatch(
  params: PracticeBatchParams
): Promise<Array<TDExercise | AnnaleItem>> {
  throwIfAborted(params.signal);
  const {
    type,
    count,
    subjectId,
    subjectName,
    difficulty,
    topicPrompt,
    sourceSheet,
    forceLocal = false,
    onProgress,
    signal,
  } = params;
  const safeCount = Math.max(1, Math.min(8, Math.round(count)));
  const isAnnale = type === 'annale';

  const difficultyLabel =
    difficulty === 'mixed'
      ? 'progressif (mélange Niveaux 1, 2 et 3 ESTACA)'
      : `Niveau ${difficulty}/3`;

  const sheetSummary = sourceSheet
    ? `Fiche de référence : "${sourceSheet.title}" (Chapitre : ${sourceSheet.chapter})
Théorèmes : ${sourceSheet.theorems.map(t => `${t.name}: ${t.statement}`).slice(0, 6).join(' | ')}
Formules : ${sourceSheet.magicFormulas.map(f => `${f.name}: ${f.formula} (${f.unitsAndVariables})`).slice(0, 8).join(' | ')}`
    : 'Aucune fiche source spécifique : appuie-toi strictement sur les lois canoniques du programme ESTACA.';

  const systemPrompt = `Tu es un professeur et examinateur ESTACA (école d'ingénieurs aéronautique, spatial & automobile).
Génère EXACTEMENT ${safeCount} ${isAnnale ? "sujets d'annales d'examen réalistes" : "exercices de TD complets"} en français, de niveau ${difficultyLabel}.

EXIGENCES DE QUALITÉ ET ZÉRO HALLUCINATION :
1. Utilise exclusivement des lois physiques/mathématiques exactes et cohérentes avec la matière "${subjectName}". Toutes les valeurs numériques données dans l'énoncé doivent permettre un calcul exact et cohérent dans la correction.
2. Chaque élément DOIT contenir :
   - Un énoncé structuré avec données numériques en unités SI (ou conversions classiques pièges : bar, km/h, °C, tr/min).
   - 2 à 3 indices progressifs ("hints").
   - Une "solution" ULTRA-DÉTAILLÉE étape par étape : 1) Hypothèses, 2) Schéma / Modélisation, 3) Démonstration littérale en LaTeX KaTeX ($...$ / $$...$$), 4) Application numérique détaillée, 5) Explication physique & commentaire critique sur l'ordre de grandeur.
${isAnnale ? '3. Pour chaque annale, fournis aussi "session", "year", "durationMinutes", "points" et "gradingCriteria" (barème détaillé).' : ''}

Format JSON strict :
{
  "exercises": [
    {
      "title": string,
      "chapter": string,
      "notion": string,
      "difficulty": number (1, 2 ou 3),
      "statement": string,
      "hints": string[],
      "solution": string${isAnnale ? `,
      "session": string,
      "year": number,
      "durationMinutes": number,
      "points": number,
      "gradingCriteria": string[]` : ''}
    }
  ]
}`;

  const userPrompt = `Matière : ${subjectName}
Thème / Consigne : ${topicPrompt.trim() || 'Programme fondamental complet du chapitre'}
Nombre d'éléments à générer : ${safeCount}
${sheetSummary}`;

  return executeWithFallback<Array<TDExercise | AnnaleItem>>(
    systemPrompt,
    userPrompt,
    (parsed) => {
      const rawList = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
      return rawList.slice(0, safeCount).map((item: any, i: number) => {
        const base: TDExercise = {
          id: `exo_gen_${Date.now()}_${i}`,
          subjectId,
          chapter: item.chapter || sourceSheet?.chapter || 'Entraînement IA',
          title: item.title || `${isAnnale ? 'Annale' : 'Exercice'} #${i + 1}`,
          notion: item.notion || topicPrompt || 'Application',
          difficulty: [1, 2, 3].includes(item.difficulty)
            ? item.difficulty
            : difficulty === 'mixed'
            ? (((i % 3) + 1) as 1 | 2 | 3)
            : difficulty,
          statement: item.statement || '',
          hints: Array.isArray(item.hints) ? item.hints : [],
          solution: item.solution || 'Correction détaillée en cours.',
          status: 'todo',
          createdAt: new Date().toISOString(),
        };

        if (isAnnale) {
          const annale: AnnaleItem = {
            ...base,
            session: item.session || 'Sujet Type ESTACA',
            year: item.year || new Date().getFullYear(),
            durationMinutes: item.durationMinutes || 90,
            points: item.points || 20,
            gradingCriteria: Array.isArray(item.gradingCriteria)
              ? item.gradingCriteria
              : [
                  'Hypothèses et modélisation : 4 pts',
                  'Résolution littérale rigoureuse : 8 pts',
                  'Calcul numérique et unités SI : 5 pts',
                  'Interprétation physique : 3 pts',
                ],
          };
          return annale;
        }
        return base;
      });
    },
    forceLocal,
    () => localBuildPracticeBatch(params),
    onProgress,
    { signal, preferLightFastModel: true }
  );
}

