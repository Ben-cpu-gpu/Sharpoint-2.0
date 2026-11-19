import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const PORT = Number(process.env.PORT) || 3000;

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);

const LEGACY_GEMINI_MAP: Record<string, string> = {
  'gemini-3.1-pro': 'gemini-2.5-pro',
  'gemini-3-flash': 'gemini-4-hydrogen',
  'gemini-2.0-flash': 'gemini-4-hydrogen',
  'gemini-2.0-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-4-hydrogen',
  'gemini-1.5-pro': 'gemini-2.5-pro',
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
    const model = resolveServerGeminiModel(req.body?.model);

    if (!ai) {
      res.status(503).json({
        error: 'Clé GEMINI_API_KEY non configurée côté serveur. Vérifiez Settings > Secrets.',
        statusCode: 503,
        model,
        rawPayload: 'MISSING_SERVER_GEMINI_API_KEY',
      });
      return;
    }

    const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
    if (!userPrompt.trim()) {
      res.status(400).json({
        error: 'Le champ userPrompt est requis.',
        statusCode: 400,
        model,
      });
      return;
    }

    const config: Record<string, unknown> = {
      responseMimeType:
        typeof req.body?.responseMimeType === 'string' && req.body.responseMimeType.trim()
          ? req.body.responseMimeType.trim()
          : 'application/json',
    };

    if (typeof req.body?.systemPrompt === 'string' && req.body.systemPrompt.trim()) {
      config.systemInstruction = req.body.systemPrompt.trim();
    }

    try {
      const response = await generateWithRetry(ai, model, userPrompt, config, 1);
      const text = response.text;
      if (!text) {
        res.status(502).json({
          error: 'Réponse Gemini vide ou filtrée.',
          statusCode: 502,
          model,
        });
        return;
      }
      res.json({ text, model });
    } catch (err) {
      const parsed = parseUpstreamError(err);
      res.status(parsed.statusCode).json({
        error: parsed.message,
        statusCode: parsed.statusCode,
        model,
        rawPayload: parsed.rawPayload,
      });
    }
  });

  app.post('/api/gemini/stream', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    const model = resolveServerGeminiModel(req.body?.model);

    if (!ai) {
      res.status(503).json({
        error: 'Clé GEMINI_API_KEY non configurée côté serveur. Vérifiez Settings > Secrets.',
        statusCode: 503,
        model,
      });
      return;
    }

    const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
    if (!userPrompt.trim()) {
      res.status(400).json({
        error: 'Le champ userPrompt est requis.',
        statusCode: 400,
        model,
      });
      return;
    }

    const config: Record<string, unknown> = {};
    if (typeof req.body?.systemPrompt === 'string' && req.body.systemPrompt.trim()) {
      config.systemInstruction = req.body.systemPrompt.trim();
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: userPrompt,
        config,
      });

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true, model })}\n\n`);
      res.end();
    } catch (err) {
      const parsed = parseUpstreamError(err);
      res.write(`data: ${JSON.stringify({ error: parsed.message, statusCode: parsed.statusCode, model })}\n\n`);
      res.end();
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
