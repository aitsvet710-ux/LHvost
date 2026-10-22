/**
 * Простая эвристика определения языка текста.
 *
 * Живёт в `src/lib`, потому что используется дважды: конвейером сбора
 * (`scripts/ai/translate.ts`) и интерфейсом (бейдж «Оригинал»). Одна
 * реализация — одинаковый результат в обоих местах.
 */

/** Языки, которые различаем эвристикой. */
export type LanguageCode = 'ru' | 'en' | 'other';

/** Доля кириллицы среди всех букв текста. */
export function cyrillicRatio(text: string): number {
  const value = text ?? '';
  const cyrillic = (value.match(/[\u0400-\u04FF]/g) ?? []).length;
  const letters = (value.match(/[A-Za-z\u0400-\u04FF]/g) ?? []).length;
  if (letters === 0) return 0;
  return cyrillic / letters;
}

/**
 * Определяет язык по доле кириллицы: больше 0.6 — русский,
 * больше 0.6 латиницы — английский, иначе «другой».
 */
export function detectLanguageCode(text: string): LanguageCode {
  const value = (text ?? '').trim();
  if (!value) return 'other';

  if (cyrillicRatio(value) > 0.6) return 'ru';

  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  const letters = (value.match(/[A-Za-z\u0400-\u04FF]/g) ?? []).length;
  if (letters > 0 && latin / letters > 0.6) return 'en';

  return 'other';
}

/**
 * Грубый ответ для интерфейса: 'ru' — текст на русском,
 * 'other' — на любом другом языке.
 */
export function detectLanguage(text: string): 'ru' | 'other' {
  return detectLanguageCode(text) === 'ru' ? 'ru' : 'other';
}
