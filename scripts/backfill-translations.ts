/**
 * Докач переводов: переводит на русский материалы, собранные до появления
 * шага перевода в конвейере.
 *
 * Идентификаторы, адреса, даты, слаги и рубрики не меняются: обновляются только
 * текстовые поля (`title`, `description`, `summary`) и флаги `translated` / `sourceLang`.
 * Если текст удалось перевести, резюме генерируется заново.
 *
 * Использование:
 *   npx tsx scripts/backfill-translations.ts                — перевести все материалы
 *   npx tsx scripts/backfill-translations.ts --dry-run     — показать изменения, не записывая файл
 *   npx tsx scripts/backfill-translations.ts --only <id>   — перевести только указанный материал
 *   npx tsx scripts/backfill-translations.ts --recategorize — пересчитать рубрику и теги по русскому тексту
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AIConfig, Material } from '../src/lib/types';
import { categorize, extractTags } from './categorize';
import { loadEnvFile, summarize } from './ai/summarize';
import { translateMaterial, translateToRussian, sourceLanguageOf } from './ai/translate';
import { normalize, type RawMaterial } from './normalize';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DATA_DIR = resolve(ROOT, 'data');
const OUTPUT_FILE = resolve(DATA_DIR, 'materials.json');

function readJson<T>(relativePath: string): T {
  const path = resolve(ROOT, relativePath);
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function loadMaterials(): Material[] {
  if (!existsSync(OUTPUT_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as Material[]) : [];
  } catch {
    return [];
  }
}

function parseArgs(): { dryRun: boolean; only?: string; recategorize: boolean } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    only: args.find((arg, index) => args[index - 1] === '--only') ?? args.find(arg => arg.startsWith('--only='))?.split('=')[1],
    recategorize: args.includes('--recategorize')
  };
}

function toRawMaterial(material: Material): RawMaterial {
  return {
    title: material.title,
    url: material.url,
    source: material.source,
    sourceType: material.sourceType,
    publishedAt: material.publishedAt,
    description: material.description,
    imageUrl: material.imageUrl,
    contentType: material.contentType,
    translated: material.translated,
    sourceLang: material.sourceLang
  };
}

function detectSourceLang(material: Material): string {
  const combined = `${material.title} ${material.description ?? ''}`;
  return sourceLanguageOf(combined);
}

async function main(): Promise<void> {
  loadEnvFile(resolve(ROOT, '.env'));

  const aiConfig = readJson<AIConfig>('src/config/ai.json');
  const { dryRun, only, recategorize } = parseArgs();

  console.log('=== Ласточкин хвост: докач переводов ===\n');
  if (dryRun) console.log('Режим dry-run: изменения не будут записаны.\n');

  const materials = loadMaterials();
  if (materials.length === 0) {
    console.log('Файл data/materials.json пуст или отсутствует.');
    return;
  }

  const targets = only ? materials.filter(material => material.id === only) : materials;
  if (only && targets.length === 0) {
    console.error(`Материал с id=${only} не найден.`);
    process.exitCode = 1;
    return;
  }

  const updated: Material[] = [];
  let translatedCount = 0;

  for (const material of targets) {
    console.log(`• ${material.title.slice(0, 70)}`);
    const sourceLang = material.sourceLang || detectSourceLang(material);

    // Уже переведённый материал — переводим только недостающие части по необходимости.
    const raw = toRawMaterial({ ...material, sourceLang });
    const translation = await translateMaterial(material.title, material.description, `${material.title} ${material.description ?? ''}`, aiConfig);

    let title = translation.translated ? translation.title : material.title;
    let description = translation.translated ? translation.description : material.description;
    let translated = material.translated === true || translation.translated;
    let newSourceLang = translation.translated ? translation.sourceLang : sourceLang;

    // Переводим summary, если материал иноязычный.
    let summary = material.summary;
    const summaryResult = await translateToRussian(summary, newSourceLang, aiConfig);
    summary = summaryResult.text;
    translated = translated || summaryResult.translated;

    let category = material.category;
    let tags = material.tags;

    if (recategorize) {
      const normalized = normalize({ ...raw, title, description });
      category = categorize(normalized);
      tags = extractTags(normalized);
      console.log(`  рубрика пересчитана: ${category}`);
    }

    if (translation.translated || summaryResult.translated || recategorize) {
      translatedCount++;
      if (translation.translated) console.log(`  переведены заголовок/описание (${newSourceLang})`);
      if (summaryResult.translated) console.log('  переведено резюме');
    }

    updated.push({
      ...material,
      title,
      description,
      summary,
      translated,
      sourceLang: translated ? newSourceLang : material.sourceLang,
      category,
      tags
    });
  }

  if (dryRun) {
    console.log(`\nБыло бы обновлено материалов: ${translatedCount}`);
    return;
  }

  const updatedMap = new Map(updated.map(material => [material.id, material]));
  const merged = materials.map(material => updatedMap.get(material.id) ?? material);

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
  console.log(`\n✓ Обновлено ${translatedCount} материалов в data/materials.json`);
}

main().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exitCode = 1;
});
