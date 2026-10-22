import type { Material } from './types';

/**
 * Добавляет базовый путь (GitHub Pages) к внутренним ссылкам.
 *
 * Пример: withBase('/archive/') -> '/LHvost/archive/'.
 *
 * BASE_URL подставляет Astro на этапе сборки. Вне Astro (например, в
 * скриптах под tsx) переменная недоступна — тогда путь не меняется.
 */
export function withBase(path: string): string {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Дата в русском формате: «5 октября 2026». */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/** Сколько дней прошло с указанной даты. */
export function getDaysAgo(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Русское склонение числительных.
 * plural(5, 'день', 'дня', 'дней') → 'дней'
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Относительная дата на русском: «сегодня», «вчера», «2 дня назад».
 */
export function relativeDateRu(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const days = getDaysAgo(dateString);
  if (days === 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
  if (days < 31) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${plural(weeks, 'неделю', 'недели', 'недель')} назад`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${plural(months, 'месяц', 'месяца', 'месяцев')} назад`;
  }
  const years = Math.floor(days / 365);
  return `${years} ${plural(years, 'год', 'года', 'лет')} назад`;
}

/**
 * Приблизительное время чтения в минутах по объёму текста.
 */
export function readingMinutes(text: string): number {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 120));
}

/**
 * Подпись времени чтения: «3 мин».
 */
export function readingTimeRu(text: string): string {
  return `${readingMinutes(text)} мин`;
}

/** Транслитерация в безопасный ЧПУ-слаг. */
export function slugify(text: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
    щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };

  return (text ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[а-я]/g, char => map[char] ?? char)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Сортировка материалов по дате публикации. */
export function sortByDate(materials: Material[], order: 'asc' | 'desc' = 'desc'): Material[] {
  return [...materials].sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

/** Материалы за последние N дней. */
export function filterByDays(materials: Material[], days: number): Material[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return materials.filter(material => new Date(material.publishedAt) >= cutoff);
}
