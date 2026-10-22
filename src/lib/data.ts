import materialsData from '../../data/materials.json';
import { CATEGORY_LIST } from './categories';
import type { Category, ContentType, Material } from './types';

const materials = materialsData as Material[];

/**
 * Приводит материал к единому виду: подставляет дефолты для новых полей,
 * чтобы старые записи в data/materials.json не теряли их.
 */
function normalizeMaterial(material: Material): Material {
  return {
    ...material,
    tags: material.tags ?? [],
    summary: material.summary ?? '',
    translated: material.translated === true,
    sourceLang: material.sourceLang
  };
}

/** Все материалы, свежие сверху. */
export function getAllMaterials(): Material[] {
  return materials
    .map(normalizeMaterial)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/**
 * Свежий выпуск: материалы за последние N дней, не больше limit штук.
 */
export function getFreshIssue(days = 7, limit = 7): Material[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return getAllMaterials()
    .filter(material => new Date(material.publishedAt).getTime() >= cutoff)
    .slice(0, limit);
}

/**
 * Материал по адресу страницы: /<slug>/.
 */
export function getMaterialBySlug(slug: string): Material | undefined {
  return getAllMaterials().find(material => material.slug === slug);
}

/**
 * Рубрики, в которых есть материалы, в порядке справочника.
 */
export function getCategories(): Category[] {
  const present = new Set(getAllMaterials().map(material => material.category));
  return CATEGORY_LIST.filter(category => present.has(category));
}

/** Названия источников, из которых есть материалы. */
export function getSources(): string[] {
  return [...new Set(getAllMaterials().map(material => material.source))];
}

/** Типы контента, которые встречаются в материалах. */
export function getContentTypes(): ContentType[] {
  return [...new Set(getAllMaterials().map(material => material.contentType))];
}
