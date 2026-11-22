import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash',
  'gemini-3.8-live',
  'gemini-3.5-flash',
]);

const LEGACY_GEMINI_MAP: Record<string, string> = {
  'gemini-3.1-pro': 'gemini-4-hydrogen',
  'gemini-3-flash': 'gemini-4-hydrogen',
  'gemini-2.5-pro': 'gemini-4-hydrogen',
  'gemini-2.5-flash': 'gemini-4-hydrogen',
  'gemini-2.0-flash': 'gemini-4-hydrogen',
  'gemini-2.0-pro': 'gemini-4-hydrogen',
  'gemini-1.5-flash': 'gemini-4-hydrogen',
  'gemini-1.5-pro': 'gemini-4-hydrogen',
  'gemini-pro': 'gemini-4-hydrogen',
};

function resolveServerGeminiModel(requested: unknown): string {
  if (typeof requested !== 'string' || !requested.trim()) {
    return 'gemini-4-hydrogen';
  }
  const trimmed = requested.trim();
  const mapped = LEGACY_GEMINI_MAP[trimmed] || trimmed;
  if (ALLOWED_GEMINI_MODELS.has(mapped)) {
    return mapped;
  }
  return 'gemini-4-hydrogen';
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ParsedUpstreamError {
  statusCode: number;
  message: string;
  rawPayload: string;
}

function parseUpstreamError(err: unknown): ParsedUpstreamError {
  const anyErr = err as { status?: number; statusCode?: number; message?: string } | undefined;
  const rawMessage = anyErr?.message || (typeof err === 'string' ? err : 'Erreur serveur Gemini');

  let statusCode = Number(anyErr?.status || anyErr?.statusCode || 0);
  if (!statusCode) {
    const codeMatch = rawMessage.match(/\b(400|401|403|404|429|500|502|503)\b/);
    statusCode = codeMatch ? Number(codeMatch[1]) : 500;
  }

  let message = rawMessage.substring(0, 320);
  if (statusCode === 401 || statusCode === 403 || rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    message = `Clé Gemini invalide ou accès refusé (HTTP ${statusCode}). Vérifiez Settings > Secrets.`;
  } else if (statusCode === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    message = 'Quota Gemini temporairement atteint (HTTP 429). Réessayez dans un instant ou vérifiez votre quota dans Settings > Secrets.';
  } else if (statusCode === 404 || rawMessage.includes('NOT_FOUND')) {
    message = 'Modèle Gemini introuvable sur l\'API (HTTP 404).';
  }

  return {
    statusCode: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message,
    rawPayload: rawMessage,
  };
}

const SERVER_GEMINI_FALLBACK_ORDER = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

const SERVER_GEMINI_LIGHT_ORDER = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
] as const;

function resolveServerGeminiModels(
  requested: unknown,
  allowCascade: boolean,
  preferLightFastModel = false
): string[] {
  if (preferLightFastModel) {
    const preferred = resolveServerGeminiModel(requested);
    if (!allowCascade) {
      return [preferred];
    }
    const chain: string[] = [preferred];
    for (const fallback of SERVER_GEMINI_LIGHT_ORDER) {
      if (!chain.includes(fallback)) {
        chain.push(fallback);
      }
    }
    return chain;
  }
  const primary = resolveServerGeminiModel(requested);
  if (!allowCascade) {
    return [primary];
  }
  const chain: string[] = [primary];
  for (const fallback of SERVER_GEMINI_FALLBACK_ORDER) {
    if (!chain.includes(fallback)) {
      chain.push(fallback);
    }
  }
  return chain;
}

function buildGeminiConfig(
  model: string,
  systemPrompt?: unknown,
  responseMimeType?: unknown,
  preferLightFastModel = false
): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (typeof responseMimeType === 'string' && responseMimeType.trim()) {
    config.responseMimeType = responseMimeType.trim();
  }
  if (typeof systemPrompt === 'string' && systemPrompt.trim()) {
    config.systemInstruction = systemPrompt.trim();
  }
  if (model.startsWith('gemini-4-')) {
    // Gemini 4 Hydrogen: LOW pour réparation KaTeX/packs rapides, MEDIUM pour extraction complète (évite les timeouts proxy 502)
    config.thinkingConfig = {
      thinkingLevel: preferLightFastModel ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM,
    };
  }
  return config;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  config: Record<string, unknown>,
  retries = 1
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (err) {
      lastError = err;
      const parsed = parseUpstreamError(err);
      const isTransient = parsed.statusCode === 500 || parsed.statusCode === 502 || parsed.statusCode === 503;
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 450 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/gemini/status', (_req: Request, res: Response) => {
    const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      configured,
      defaultModel: 'gemini-4-hydrogen',
    });
  });

  app.post('/api/gemini/generate', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    const allowCascade = req.body?.cascadeModels !== false;
    const preferLightFastModel = req.body?.preferLightFastModel === true;
    const candidateModels = resolveServerGeminiModels(
      req.body?.model,
      allowCascade,
      preferLightFastModel
    );

    if (!ai) {
      res.status(503).json({
        error: 'Clé GEMINI_API_KEY non configurée côté serveur. Vérifiez Settings > Secrets.',
        statusCode: 503,
        model: candidateModels[0],
        rawPayload: 'MISSING_SERVER_GEMINI_API_KEY',
      });
      return;
    }

    const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
    if (!userPrompt.trim()) {
      res.status(400).json({
        error: 'Le champ userPrompt est requis.',
        statusCode: 400,
        model: candidateModels[0],
      });
      return;
    }

    const responseMimeType =
      typeof req.body?.responseMimeType === 'string' && req.body.responseMimeType.trim()
        ? req.body.responseMimeType.trim()
        : 'application/json';

    let lastFailure: ParsedUpstreamError = {
      statusCode: 502,
      message: 'Réponse Gemini vide ou filtrée.',
      rawPayload: '',
    };
    let lastFailedModel = candidateModels[0];

    for (const model of candidateModels) {
      lastFailedModel = model;
      try {
        const config = buildGeminiConfig(
          model,
          req.body?.systemPrompt,
          responseMimeType,
          preferLightFastModel
        );
        const response = await generateWithRetry(ai, model, userPrompt, config, 1);
        const text = response.text;
        if (text && text.trim()) {
          res.json({ text, model });
          return;
        }
        lastFailure = {
          statusCode: 502,
          message: `Réponse Gemini vide sur ${model}.`,
          rawPayload: 'EMPTY_RESPONSE',
        };
      } catch (err) {
        lastFailure = parseUpstreamError(err);
        if (lastFailure.statusCode === 401 || lastFailure.statusCode === 403) {
          break;
        }
      }
    }

    res.status(lastFailure.statusCode).json({
      error: lastFailure.message,
      statusCode: lastFailure.statusCode,
      model: lastFailedModel,
      rawPayload: lastFailure.rawPayload,
    });
  });

  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    const allowCascade = req.body?.cascadeModels !== false;
    const preferLightFastModel = req.body?.preferLightFastModel === true;
    const candidateModels = resolveServerGeminiModels(
      req.body?.model,
      allowCascade,
      preferLightFastModel
    );

    if (!ai) {
      res.status(503).json({
        error: 'Clé GEMINI_API_KEY non configurée côté serveur. Vérifiez Settings > Secrets.',
        statusCode: 503,
        model: candidateModels[0],
        rawPayload: 'MISSING_SERVER_GEMINI_API_KEY',
      });
      return;
    }

    const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
    if (!userPrompt.trim()) {
      res.status(400).json({
        error: 'Le champ userPrompt est requis.',
        statusCode: 400,
        model: candidateModels[0],
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let clientClosed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true;
      }
    });

    res.write(': connected\n\n');

    // Heartbeat toutes les 3s pour empêcher le proxy Cloud Run / navigateur de couper en 502 pendant la réflexion Gemini 4
    const keepaliveTimer = setInterval(() => {
      if (!clientClosed && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 3000);

    let lastFailure: ParsedUpstreamError = {
      statusCode: 502,
      message: 'Réponse stream Gemini vide.',
      rawPayload: '',
    };
    let lastFailedModel = candidateModels[0];

    try {
      for (const model of candidateModels) {
        if (clientClosed || res.writableEnded) break;
        lastFailedModel = model;
        let streamedAnyText = false;
        try {
          res.write(`data: ${JSON.stringify({ stage: 'model', model })}\n\n`);
          const config = buildGeminiConfig(
            model,
            req.body?.systemPrompt,
            req.body?.responseMimeType || 'application/json',
            preferLightFastModel
          );
          const stream = await ai.models.generateContentStream({
            model,
            contents: userPrompt,
            config,
          });

          for await (const chunk of stream) {
            if (clientClosed || res.writableEnded) break;
            const chunkText = chunk.text || '';
            if (chunkText) {
              streamedAnyText = true;
              res.write(`data: ${JSON.stringify({ text: chunkText, model })}\n\n`);
            }
          }

          if (clientClosed) {
            return;
          }

          if (streamedAnyText) {
            res.write(`data: ${JSON.stringify({ done: true, model })}\n\n`);
            res.end();
            return;
          }
          lastFailure = {
            statusCode: 502,
            message: `Réponse stream Gemini vide sur ${model}.`,
            rawPayload: 'EMPTY_STREAM',
          };
        } catch (err) {
          lastFailure = parseUpstreamError(err);
          if (streamedAnyText || lastFailure.statusCode === 401 || lastFailure.statusCode === 403) {
            break;
          }
        }
      }

      if (!clientClosed && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error: lastFailure.message,
            statusCode: lastFailure.statusCode,
            model: lastFailedModel,
            rawPayload: lastFailure.rawPayload,
          })}\n\n`
        );
        res.end();
      }
    } finally {
      clearInterval(keepaliveTimer);
    }
  });

  app.post('/api/gemini/health', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    const model = resolveServerGeminiModel(req.body?.model);

    if (!ai) {
      res.status(503).json({
        ok: false,
        statusCode: 503,
        model,
        error: 'Clé GEMINI_API_KEY non configurée côté serveur (Settings > Secrets).',
        rawPayload: 'MISSING_SERVER_GEMINI_API_KEY',
      });
      return;
    }

    const started = performance.now();
    try {
      const healthConfig: Record<string, unknown> = {
        systemInstruction: 'Réponds strictement par l\'objet JSON {"ok":true}.',
        responseMimeType: 'application/json',
      };
      if (model.startsWith('gemini-4-')) {
        healthConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }
      const response = await ai.models.generateContent({
        model,
        contents: 'Test de connectivité API.',
        config: healthConfig,
      });
      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      if (!response.text) {
        res.status(502).json({
          ok: false,
          latencyMs,
          statusCode: 502,
          model,
          error: 'Réponse Gemini vide lors du test.',
        });
        return;
      }
      res.json({
        ok: true,
        latencyMs,
        statusCode: 200,
        model,
      });
    } catch (err) {
      const latencyMs = Math.max(1, Math.round(performance.now() - started));
      const parsed = parseUpstreamError(err);
      res.status(parsed.statusCode).json({
        ok: false,
        latencyMs,
        statusCode: parsed.statusCode,
        model,
        error: parsed.message,
        rawPayload: parsed.rawPayload,
      });
    }
  });

  // Garantit que toute route /api/* inconnue renvoie du JSON et jamais le shell HTML SPA
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: `Route API introuvable : ${req.originalUrl}`,
      statusCode: 404,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
        return;
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FicheMaster IA server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
