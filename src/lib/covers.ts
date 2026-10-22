import type { Category, Material } from './types';
import { CATEGORY_META, DEFAULT_CATEGORY_SLUG } from './categories';
import { withBase } from './utils';

/** Слаг рубрики, по которому ищется обложка. */
function categorySlug(category: string): string {
  return CATEGORY_META[category as Category]?.slug ?? DEFAULT_CATEGORY_SLUG;
}

/**
 * Путь к обложке рубрики без базового пути — для мета-тегов og:image.
 */
export function getCategoryCoverPath(category: string): string {
  return `/images/categories/${categorySlug(category)}.webp`;
}

/**
 * Путь к обложке рубрики с учётом base path — для `src` картинок.
 */
export function getCategoryCover(category: string): string {
  return withBase(getCategoryCoverPath(category));
}

/**
 * Обложка материала.
 *
 * Основной путь — тематическая картинка по рубрике из `public/images/categories/`.
 * Точка расширения: если у материала появится поле `cover` со ссылкой на
 * сгенерированное изображение, оно будет использовано без правок кода.
 * Подключение генерации (IMAGE_GEN_API_KEY / OPENROUTER_API_KEY) — задача
 * владельца проекта, см. AGENTS.md.
 */
export function getCoverForMaterial(material: Material): string {
  const generated = (material as Material & { cover?: string }).cover;
  if (generated) return generated;
  return getCategoryCover(material.category);
}
