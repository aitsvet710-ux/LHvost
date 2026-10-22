import { existsSync, readFileSync } from 'node:fs';
import type { AIConfig } from '../../src/lib/types';
import type { RawMaterial } from '../normalize';

/**
 * Загружает переменные окружения из .env без зависимостей.
 */
export function loadEnvFile(path = '.env'): void {
  try {
    if (!existsSync(path)) return;
    const content = readFileSync(path, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env необязателен — пропускаем
  }
}

function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || undefined;
}

/**
 * Длина фрагмента описания, который попадает в резюме без AI-ключа.
 */
const FALLBACK_LENGTH = 200;

/**
 * Эвристическое резюме — используется, если AI недоступен.
 * Берёт первые 200 символов описания.
 */
export function fallbackSummary(material: RawMaterial): string {
  const description = (material.description ?? '').replace(/\s+/g, ' ').trim();

  if (!description) {
    return `«${material.title}». Подробное описание появится после подключения AI-ключа.`;
  }

  const cut = description.slice(0, FALLBACK_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  const short = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim();

  return short.length < description.length ? `${short}…` : short;
}

/**
 * Генерирует резюме через LLM (OpenRouter, OpenAI-совместимый API).
 * При любой ошибке возвращает null — вызывающий код использует fallback.
 */
export async function aiSummary(
  material: RawMaterial,
  config: AIConfig
): Promise<string | null> {
  if (!config.enabled) return null;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('  ⚠ API-ключ не найден (OPENROUTER_API_KEY) — используется эвристическое резюме');
    return null;
  }

  const prompt = config.prompt
    .replace('{title}', material.title.replace(/"/g, "'"))
    .replace('{description}', (material.description ?? 'нет описания').replace(/"/g, "'"));

  const endpoint =
    config.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/aitsvet710-ux/LHvost';
    headers['X-Title'] = 'LHvost Digest';
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`  ⚠ AI ответил статусом ${response.status} — используется fallback`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.warn('  ⚠ AI вернул пустой ответ — используется fallback');
      return null;
    }

    return text.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.warn(`  ⚠ Ошибка AI (${(error as Error).message}) — используется fallback`);
    return null;
  }
}

/**
 * Резюме с автоматическим fallback.
 */
export async function summarize(
  material: RawMaterial,
  config: AIConfig
): Promise<string> {
  const ai = await aiSummary(material, config);
  return ai ?? fallbackSummary(material);
}
