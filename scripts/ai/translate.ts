import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import aiConfigJson from '../../src/config/ai.json';
import siteConfig from '../../src/config/site.json';
import type { AIConfig } from '../../src/lib/types';
import { detectLanguage, detectLanguageCode } from '../../src/lib/language';

export { detectLanguage };

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '..', 'cache');
const CACHE_FILE = resolve(CACHE_DIR, 'translations.json');

/**
 * Минимальная длина текста, для которой эвристика языка надёжна.
 * Короткие строки переводим без оглядки на эвристику.
 */
const MIN_RELIABLE_LENGTH = 20;

export interface TranslationResult {
  /** Переведённый текст или оригинал, если перевести не удалось. */
  text: string;
  /** Удалось ли перевести. */
  translated: boolean;
  /** Модель, которой перевели. */
  model?: string;
}

interface CacheEntry {
  text: string;
  model: string;
}

type TranslationCache = Record<string, CacheEntry>;

function loadCache(): TranslationCache {
  try {
    if (!existsSync(CACHE_FILE)) return {};
    const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    return typeof parsed === 'object' && parsed !== null ? (parsed as TranslationCache) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: TranslationCache): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf-8');
  } catch (error) {
    console.warn(`⚠ Не удалось сохранить кэш переводов: ${(error as Error).message}`);
  }
}

function cacheKey(text: string, model: string): string {
  return createHash('sha256').update(`${model}\n${text}`).digest('hex');
}

function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || undefined;
}

let warnedAboutMissingKey = false;
let warnedAboutDisabled = false;

function warnOnceMissingKey(): void {
  if (warnedAboutMissingKey) return;
  warnedAboutMissingKey = true;
  console.warn('⚠ OPENROUTER_API_KEY не задан — перевод иноязычных материалов пропущен.');
}

function warnOnceDisabled(): void {
  if (warnedAboutDisabled) return;
  warnedAboutDisabled = true;
  console.warn('⚠ Перевод отключён в src/config/ai.json — оригинальные тексты оставлены.');
}

/**
 * Определяет язык оригинала по совокупности заголовка и описания.
 */
export function sourceLanguageOf(combined: string): string {
  const value = (combined ?? '').trim();
  if (!value) return 'other';
  if (value.length < MIN_RELIABLE_LENGTH) return detectLanguageCode(value);
  return detectLanguageCode(value);
}

/**
 * Переводит текст на русский через OpenRouter.
 *
 * Правила:
 * - если перевод отключён в конфиге — возвращает оригинал;
 * - если ключа нет — возвращает оригинал с одноразовым предупреждением;
 * - если текст уже на русском — возвращает оригинал;
 * - результат берётся из кэша при совпадении текста и модели;
 * - при таймауте, ошибке API или пустом ответе — оригинал с `translated: false`;
 * - сбор никогда не падает из-за перевода.
 */
export async function translateToRussian(
  original: string,
  sourceLang: string | undefined,
  config: AIConfig = aiConfigJson as AIConfig
): Promise<TranslationResult> {
  const trimmed = (original ?? '').trim();
  if (!trimmed) return { text: original, translated: false };

  const translation = config.translation;
  if (!translation?.enabled) {
    warnOnceDisabled();
    return { text: original, translated: false };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    warnOnceMissingKey();
    return { text: original, translated: false };
  }

  // Быстрый выход: текст уже на русском.
  if (sourceLang) {
    if (sourceLang === 'ru') return { text: original, translated: false };
  } else if (trimmed.length >= MIN_RELIABLE_LENGTH) {
    if (detectLanguage(trimmed) === 'ru') return { text: original, translated: false };
  } else if (detectLanguage(trimmed) === 'ru') {
    return { text: original, translated: false };
  }

  const cache = loadCache();
  const key = cacheKey(trimmed, translation.model);
  const cached = cache[key];
  if (cached?.text) {
    return { text: cached.text, translated: true, model: cached.model };
  }

  const prompt = (translation.prompt || '').replace('{text}', trimmed);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), translation.timeoutMs || 20000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/aitsvet710-ux/LHvost',
        'X-Title': siteConfig.name || 'Ласточкин хвост'
      },
      body: JSON.stringify({
        model: translation.model,
        messages: [
          { role: 'system', content: 'Ты переводчик. Переводи строго по заданию, без комментариев.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: translation.maxTokens || 1024,
        temperature: translation.temperature ?? 0.2
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`⚠ Ошибка перевода (${response.status}): ${errorBody.slice(0, 160)}`);
      return { text: original, translated: false };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const translated = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '').trim();

    if (!translated) {
      console.warn('⚠ Пустой ответ при переводе — оставлен оригинал.');
      return { text: original, translated: false };
    }

    cache[key] = { text: translated, model: translation.model };
    saveCache(cache);

    return { text: translated, translated: true, model: translation.model };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('⚠ Таймаут перевода — оставлен оригинал.');
    } else {
      console.warn(`⚠ Ошибка перевода: ${(error as Error).message}`);
    }
    return { text: original, translated: false };
  } finally {
    clearTimeout(timeout);
  }
}

export interface TranslateMaterialResult {
  title: string;
  description?: string;
  translated: boolean;
  sourceLang: string;
}

/**
 * Переводит иноязычный материал на русский: заголовок и описание.
 * Перевод идёт до фильтра — так фильтр получает шанс отсеять мусор по русским маркерам.
 * Если ключа нет или перевод не удался — материал остаётся на языке источника.
 */
export async function translateMaterial(
  title: string,
  description: string | undefined,
  combinedText: string,
  config: AIConfig = aiConfigJson as AIConfig
): Promise<TranslateMaterialResult> {
  const sourceLang = sourceLanguageOf(combinedText);
  if (sourceLang === 'ru') {
    return { title, description, translated: false, sourceLang };
  }

  const translation = config.translation;
  if (!translation?.enabled) {
    warnOnceDisabled();
    return { title, description, translated: false, sourceLang };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    warnOnceMissingKey();
    return { title, description, translated: false, sourceLang };
  }

  const titleResult = await translateToRussian(title, sourceLang, config);
  const descriptionResult = description
    ? await translateToRussian(description, sourceLang, config)
    : undefined;

  return {
    title: titleResult.text,
    description: descriptionResult?.text ?? description,
    translated: titleResult.translated || descriptionResult?.translated === true,
    sourceLang
  };
}
