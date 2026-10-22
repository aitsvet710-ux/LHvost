import type { ContentType, SourceType } from '../src/lib/types';

export interface RawMaterial {
  title: string;
  url: string;
  source: string;
  sourceType: SourceType;
  publishedAt: string;
  description?: string;
  imageUrl?: string;
  contentType?: ContentType;
  /** Материал переведён на русский автоматически. */
  translated?: boolean;
  /** Язык оригинала, если материал переводили. */
  sourceLang?: string;
}

/**
 * Очищает HTML-теги, сущности и нормализует пробелы.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Убирает служебные «хвосты» из RSS-описаний (WordPress и подобные).
 */
export function stripBoilerplate(text: string): string {
  return text
    .replace(/The post\s+.+?\s+appeared first on\s+.+?\.?\s*$/i, '')
    .replace(/\[…\]\s*$/, '')
    .replace(/Read more\s*$/i, '')
    .replace(/The post .*? appeared first on .*?\.?$/i, '')
    .replace(/\b(Continue reading|Читать далее)\b\.?$/i, '')
    .replace(/\bMwraps\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Приводит описание к читаемому виду и ограничивает длину.
 */
export function normalizeDescription(text?: string, maxLength = 600): string | undefined {
  if (!text) return undefined;
  const clean = stripBoilerplate(stripHtml(text));
  if (!clean) return undefined;
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : maxLength).trim()}…`;
}

/**
 * Определяет тип контента по URL и заголовку.
 */
export function detectContentType(url: string, title = ''): ContentType {
  const lower = (url + ' ' + title).toLowerCase();
  if (/(youtube\.com|youtu\.be|vkvideo|youtube)/.test(lower)) return 'видео';
  if (/(reddit|pikabu|forum|discussion|comments|telegram)/.test(lower)) return 'обсуждение';
  return 'статья';
}

/**
 * Пытается достать дату из URL (типичный WordPress-шаблон /YYYY/MM/DD/slug).
 */
export function dateFromUrl(url: string): Date | null {
  const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})(?:\/|$)/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Приводит дату к ISO-формату. Если дата невалидна, пробует взять её из URL.
 * Если и там нет — возвращает текущее время.
 */
export function normalizeDate(value?: string | Date, url?: string): string {
  if (value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  if (url) {
    const fromUrl = dateFromUrl(url);
    if (fromUrl) return fromUrl.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Извлекает картинку-превью из HTML-описания.
 */
export function extractImage(html?: string): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/**
 * Приводит сырой материал к единому виду.
 */
export function normalize(raw: RawMaterial): RawMaterial {
  return {
    ...raw,
    title: stripHtml(raw.title).trim(),
    url: raw.url.trim(),
    source: raw.source.trim(),
    publishedAt: normalizeDate(raw.publishedAt, raw.url),
    description: normalizeDescription(raw.description),
    imageUrl: raw.imageUrl ?? extractImage(raw.description),
    contentType: raw.contentType ?? detectContentType(raw.url, raw.title)
  };
}
