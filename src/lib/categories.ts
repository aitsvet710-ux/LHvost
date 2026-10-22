import type { Category } from './types';

/**
 * Справочник рубрик: слаг, описание, цвета и иконка.
 * Цвета заданы готовыми классами Tailwind — так они попадают в сборку.
 */
export interface CategoryMeta {
  /** Слаг рубрики: используется в ссылках и в именах файлов обложек. */
  slug: string;
  /** Короткое описание рубрики. */
  hint: string;
  /** Бейдж рубрики: заливка и текст. */
  badge: string;
  /** Акцентный цвет рубрики: иконки, полосы, активные состояния. */
  accent: string;
  /** Мягкая заливка для плиток. */
  soft: string;
  /** Градиент для полосы-«тепловой» подсказки. */
  gradient: string;
  /** Иконка рубрики: разметка SVG в сетке 24×24. */
  icon: string;
}

/** Иконки рубрик — линейная графика в сетке 24×24. */
const ICONS = {
  instrument:
    '<circle cx="6.5" cy="17.5" r="3.5"/><path d="M9.4 14.6 20 4"/><path d="M16 4h4v4"/>',
  project:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  technique:
    '<circle cx="10" cy="14" r="7"/><circle cx="10" cy="14" r="2.6"/><path d="m15 9 6-6"/><path d="M21 3h-4.5M21 3v4.5"/>',
  safety:
    '<path d="M12 3 4.5 5.8v5.4c0 4.6 3.1 7.8 7.5 8.8 4.4-1 7.5-4.2 7.5-8.8V5.8z"/>',
  events:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  inspiration:
    '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.4 10.9c.6.5 1 1.2 1 2.1h4.8c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'
} as const;

/** Рубрики в порядке отображения. */
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  'Инструмент': {
    slug: 'instrument',
    hint: 'Обзоры, сравнения, выбор под задачу',
    badge: 'bg-terracotta-600 text-white',
    accent: 'text-terracotta-600',
    soft: 'bg-terracotta-100',
    gradient: 'from-terracotta-500 to-amber-500',
    icon: ICONS.instrument
  },
  'Проект/чертёж': {
    slug: 'project',
    hint: 'Готовые чертежи и разборы изготовления',
    badge: 'bg-amber-500 text-graphite-900',
    accent: 'text-amber-600',
    soft: 'bg-amber-100',
    gradient: 'from-amber-500 to-ochre-500',
    icon: ICONS.project
  },
  'Техника и приёмы': {
    slug: 'technique',
    hint: 'Рабочие способы, которые экономят время',
    badge: 'bg-teal-600 text-white',
    accent: 'text-teal-600',
    soft: 'bg-teal-100',
    gradient: 'from-teal-500 to-teal-400',
    icon: ICONS.technique
  },
  'Безопасность': {
    slug: 'safety',
    hint: 'Охрана труда, пыль, ЛКМ, защита',
    badge: 'bg-graphite-800 text-sand-100',
    accent: 'text-graphite-700',
    soft: 'bg-paper-200',
    gradient: 'from-graphite-800 to-graphite-600',
    icon: ICONS.safety
  },
  'События/выставки': {
    slug: 'events',
    hint: 'Встречи, мастер-классы, выставки',
    badge: 'bg-plum-600 text-white',
    accent: 'text-plum-600',
    soft: 'bg-plum-100',
    gradient: 'from-plum-500 to-plum-400',
    icon: ICONS.events
  },
  'Вдохновение': {
    slug: 'inspiration',
    hint: 'Работы мастеров и идеи для своих проектов',
    badge: 'bg-ochre-600 text-white',
    accent: 'text-ochre-600',
    soft: 'bg-ochre-100',
    gradient: 'from-ochre-500 to-terracotta-400',
    icon: ICONS.inspiration
  }
};

/** Запасная рубрика для материалов с неизвестной категорией. */
export const DEFAULT_CATEGORY_SLUG = 'default';

/** Все рубрики в порядке отображения. */
export const CATEGORY_LIST = Object.keys(CATEGORY_META) as Category[];

/** Иконка источника материала. */
export const SOURCE_ICONS: Record<string, string> = {
  telegram: '<path d="M3 11.5 21 3l-8.5 18-2.5-7z"/><path d="M3 11.5 10 14 21 3"/>',
  rss: '<circle cx="5.5" cy="18.5" r="2"/><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 5a15 15 0 0 1 15 15"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.5 15 12l-4.5 2.5z"/>'
};

/** Подпись типа источника на русском. */
export const SOURCE_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  rss: 'Блог',
  youtube: 'YouTube'
};
