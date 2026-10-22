import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AIConfig, Material, SourcesConfig } from '../src/lib/types';
import { categorize, extractTags } from './categorize';
import { isValuable } from './filter';
import { normalize, type RawMaterial } from './normalize';
import { loadEnvFile, summarize } from './ai/summarize';
import { translateMaterial, translateToRussian } from './ai/translate';
import { collectRss } from './adapters/rss';
import { collectTelegramPublic, collectTelegramViaApi } from './adapters/telegram';
import { collectYoutube } from './adapters/youtube';
import { slugify } from '../src/lib/utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DATA_DIR = resolve(ROOT, 'data');
const OUTPUT_FILE = resolve(DATA_DIR, 'materials.json');

/** Сколько дней считать «свежим». */
const FRESH_DAYS = 30;

/** Источник демонстрационных материалов. */
const MOCK_SOURCE = 'Демо-источник';

function readJson<T>(relativePath: string): T {
  const path = resolve(ROOT, relativePath);
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/**
 * Собирает сырые материалы со всех включённых источников.
 * Каждый источник изолирован: сбой одного не влияет на остальные.
 */
async function collectAll(sources: SourcesConfig): Promise<RawMaterial[]> {
  const collected: RawMaterial[] = [];

  for (const source of sources.telegram ?? []) {
    if (!source.enabled) continue;
    console.log(`→ Telegram: ${source.name}`);
    const useApi = Boolean(process.env.TELEGRAM_SESSION);
    const items = useApi
      ? await collectTelegramViaApi(source)
      : await collectTelegramPublic(source);
    console.log(`  найдено: ${items.length}`);
    collected.push(...items);
  }

  for (const source of sources.rss ?? []) {
    if (!source.enabled) continue;
    console.log(`→ RSS: ${source.name}`);
    const items = await collectRss(source);
    console.log(`  найдено: ${items.length}`);
    collected.push(...items);
  }

  for (const source of sources.youtube ?? []) {
    if (!source.enabled) continue;
    console.log(`→ YouTube: ${source.name}`);
    const items = await collectYoutube(source);
    console.log(`  найдено: ${items.length}`);
    collected.push(...items);
  }

  return collected;
}

/**
 * Дедупликация по URL и id.
 */
function dedupe(materials: RawMaterial[]): RawMaterial[] {
  const seen = new Set<string>();
  const result: RawMaterial[] = [];

  for (const material of materials) {
    const key = material.url.replace(/\?.*$/, '').replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(material);
  }

  return result;
}

/**
 * Моковые материалы — чтобы сайт собирался, даже когда источники недоступны.
 */
function mockMaterials(): RawMaterial[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      title: 'Обзор ручного фрезерного станка для мастерской: что реально работает',
      url: 'https://example.com/mock/router-review',
      source: MOCK_SOURCE,
      sourceType: 'rss',
      publishedAt: new Date(now - day).toISOString(),
      description:
        'Сравнение двух станков для финишной фрезеровки: биение шпинделя, точность хода и удобство смены фрез. Разбор с фотографиями реальных замеров.',
      contentType: 'статья'
    },
    {
      title: 'Чертёж корпусного шкафа на раскропе: размеры, узлы, спецификация фурнитуры',
      url: 'https://example.com/mock/shkaf-chertezh',
      source: MOCK_SOURCE,
      sourceType: 'rss',
      publishedAt: new Date(now - 2 * day).toISOString(),
      description:
        'Полный комплект чертежей корпусного шкафа из ЛДСП: раскрой, присадка, узлы сборки и список фурнитуры с артикулами.',
      contentType: 'статья'
    },
    {
      title: 'Безопасность при финишной шлифовке: пылесос, респиратор и вентиляция',
      url: 'https://example.com/mock/safety',
      source: MOCK_SOURCE,
      sourceType: 'telegram',
      publishedAt: new Date(now - 3 * day).toISOString(),
      description:
        'Разбор охраны труда при работе с ЛКМ и пылью: подбор средств защиты, организация вытяжки и правильная настройка пылеудаления.',
      contentType: 'обсуждение'
    },
    {
      title: 'Техника финишной отделки массива: масло, воск и ручная доводка до шелковистого блеска',
      url: 'https://example.com/mock/finish',
      source: MOCK_SOURCE,
      sourceType: 'rss',
      publishedAt: new Date(now - 4 * day).toISOString(),
      description:
        'Пошаговая техника обработки поверхности дубовой доски: шлифование по зерну, нанесение масла, вощение и устранение задиров.',
      contentType: 'статья'
    },
    {
      title: 'Самодельный кондуктор для сверления отверстий в ножках стула',
      url: 'https://example.com/mock/konduktor',
      source: MOCK_SOURCE,
      sourceType: 'telegram',
      publishedAt: new Date(now - 5 * day).toISOString(),
      description:
        'Конструкция простого кондуктора из фанеры, который повторяет разметку и позволяет сверлить декоративные отверстия без разметки каждый раз.',
      contentType: 'обсуждение'
    },
    {
      title: 'Демонстрация станка с ЧПУ: сборка корпуса из массива за один день',
      url: 'https://example.com/mock/cnc-video',
      source: MOCK_SOURCE,
      sourceType: 'youtube',
      publishedAt: new Date(now - 6 * day).toISOString(),
      description:
        'Видео-мастер-класс: раскрой, фрезеровка деталей на станке с ЧПУ и сборка корпуса. Показаны реальные режимы и хронометраж.',
      contentType: 'видео'
    },
    {
      title: 'Выставка столярного искусства: разбор экспозиции и новинок инструментов',
      url: 'https://example.com/mock/vystavka',
      source: MOCK_SOURCE,
      sourceType: 'rss',
      publishedAt: new Date(now - 7 * day).toISOString(),
      description:
        'Обзор выставки мастеров: лучшие работы участников, новинки станков и струбцины, конкурс проектов и график встреч.',
      contentType: 'статья'
    },
    {
      title: 'Вдохновение: верстак из цельного массива дуба, который делают вручную',
      url: 'https://example.com/mock/bench',
      source: MOCK_SOURCE,
      sourceType: 'rss',
      publishedAt: new Date(now - 8 * day).toISOString(),
      description:
        'История мастера, который изготовил верстак из цельного дуба: выбор материала, дизайн столешницы, патина и уход за деревом.',
      contentType: 'статья'
    }
  ];
}

/**
 * Читает ранее собранные материалы, чтобы сохранить историю.
 */
function loadExisting(): Material[] {
  if (!existsSync(OUTPUT_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as Material[]) : [];
  } catch {
    return [];
  }
}

/**
 * Уникальный идентификатор материала — производная от адреса источника.
 */
function makeId(material: RawMaterial): string {
  return material.url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * Адрес страницы материала: транслитерированный заголовок и короткий хэш,
 * чтобы слаг оставался уникальным и не менялся при одинаковых заголовках.
 */
function makeSlug(material: RawMaterial): string {
  const base = slugify(material.title).slice(0, 60) || 'material';
  const hash = createHash('sha1').update(material.url).digest('hex').slice(0, 6);
  return `${base}-${hash}`;
}

async function main(): Promise<void> {
  loadEnvFile(resolve(ROOT, '.env'));

  const sources = readJson<SourcesConfig>('src/config/sources.json');
  const aiConfig = readJson<AIConfig>('src/config/ai.json');

  console.log('=== Ласточкин хвост: сбор материалов ===\n');

  let raw: RawMaterial[] = [];
  try {
    raw = await collectAll(sources);
  } catch (error) {
    console.warn(`⚠ Сбор завершился с ошибкой: ${(error as Error).message}`);
  }

  if (raw.length === 0) {
    console.log('\n⚠ Ничего не собрано — использую демонстрационные материалы.');
    raw = mockMaterials();
  }

  raw = dedupe(raw);

  const normalized = raw.map(normalize);

  // Переводим иноязычные материалы до фильтра — фильтр смотрит на русский текст.
  const localized: RawMaterial[] = [];
  for (const material of normalized) {
    const translated = await translateMaterial(
      material.title,
      material.description,
      `${material.title} ${material.description ?? ''}`,
      aiConfig
    );
    localized.push({
      ...material,
      title: translated.title,
      description: translated.description,
      translated: translated.translated,
      sourceLang: translated.sourceLang
    });
  }

  const passed = localized.filter(material => {
    const verdict = isValuable(material);
    if (!verdict.passed) {
      console.log(`  ✗ отсеян: ${material.title.slice(0, 60)} — ${verdict.reason}`);
    }
    return verdict.passed;
  });

  console.log(`\nПрошло фильтрацию: ${passed.length} из ${normalized.length}`);

  const cutoff = Date.now() - FRESH_DAYS * 24 * 60 * 60 * 1000;
  const fresh = passed.filter(material => new Date(material.publishedAt).getTime() >= cutoff);

  const previous = loadExisting();
  const previousIds = new Set(previous.map(material => material.id));
  const toProcess = fresh.filter(material => !previousIds.has(makeId(material)));

  console.log(`Новых материалов к обработке: ${toProcess.length}`);

  const processed: Material[] = [];
  for (const material of toProcess) {
    console.log(`  • ${material.title.slice(0, 70)}`);
    const summary = await summarize(material, aiConfig);
    const summaryTranslation = await translateToRussian(summary, material.sourceLang, aiConfig);
    processed.push({
      id: makeId(material),
      slug: makeSlug(material),
      title: material.title,
      summary: summaryTranslation.text,
      url: material.url,
      source: material.source,
      sourceType: material.sourceType,
      contentType: material.contentType ?? 'статья',
      category: categorize(material),
      publishedAt: material.publishedAt,
      tags: extractTags(material),
      description: material.description,
      imageUrl: material.imageUrl,
      collectedAt: new Date().toISOString(),
      translated: material.translated === true || summaryTranslation.translated || false,
      sourceLang: material.sourceLang
    });
  }

  // Демо-материалы убираем, как только появляются настоящие.
  const hasRealData = processed.length > 0 || previous.some(material => material.source !== MOCK_SOURCE);
  const keptPrevious = hasRealData
    ? previous.filter(material => material.source !== MOCK_SOURCE)
    : previous;

  const merged = [...processed, ...keptPrevious]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 500);

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');

  console.log(`\n✓ Записано ${merged.length} материалов в data/materials.json`);
}

main().catch(error => {
  console.error('Критическая ошибка сбора:', error);
  process.exitCode = 1;
});
