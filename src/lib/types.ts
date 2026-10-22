/** Рубрики дайджеста. */
export type Category =
  | 'Инструмент'
  | 'Проект/чертёж'
  | 'Техника и приёмы'
  | 'Безопасность'
  | 'События/выставки'
  | 'Вдохновение';

/** Тип материала. */
export type ContentType = 'статья' | 'видео' | 'обсуждение';

/** Тип источника. */
export type SourceType = 'telegram' | 'rss' | 'youtube';

export interface Source {
  /** Отображаемое название источника. */
  name: string;
  /** Адрес ленты или канала. Для Telegram — имя канала или t.me/s/<канал>. */
  url?: string;
  /** Включён ли источник в конвейер. */
  enabled: boolean;
  /** Заметка для владельца проекта. */
  notes?: string;
}

export interface SourcesConfig {
  telegram: Source[];
  rss: Source[];
  youtube: Source[];
}

export interface Material {
  /** Уникальный идентификатор материала. */
  id: string;
  /** ЧПУ-безопасный адрес страницы материала: /<slug>/. */
  slug: string;
  /** Заголовок материала. */
  title: string;
  /** Краткое описание (до 2 предложений). */
  summary: string;
  /** Ссылка на первоисточник. */
  url: string;
  /** Название источника. */
  source: string;
  /** Тип источника. */
  sourceType: SourceType;
  /** Тип материала. */
  contentType: ContentType;
  /** Рубрика. */
  category: Category;
  /** Дата публикации в ISO-формате. */
  publishedAt: string;
  /** Теги материала. */
  tags: string[];
  /** Оригинальное описание источника, если отличается от summary. */
  description?: string;
  /** Ссылка на изображение из источника. */
  imageUrl?: string;
  /** Дата сбора материала в ISO-формате. */
  collectedAt: string;
  /** Материал переведён на русский автоматически. */
  translated?: boolean;
  /** Язык оригинала, если материал переводили. */
  sourceLang?: string;
}

export interface SiteConfig {
  /** Название бренда. */
  name: string;
  /** Короткий подзаголовок под названием. */
  tagline: string;
  /** Полное название для заголовка главной страницы. */
  title: string;
  /** Описание для мета-тегов. */
  description: string;
  /** Ссылка на сообщество. */
  vkUrl: string;
}

export interface AIConfig {
  /** Включено ли суммарирование. */
  enabled: boolean;
  /** Провайдер API: openrouter или openai. */
  provider: string;
  /** Модель суммаризации. */
  model: string;
  maxTokens: number;
  temperature: number;
  /** Промпт суммаризации с плейсхолдерами {title} и {description}. */
  prompt: string;
  /** Настройки автоматического перевода. */
  translation: TranslationConfig;
}

/** Настройки автоматического перевода иноязычных материалов. */
export interface TranslationConfig {
  /** Включён ли перевод. Выключается без падения конвейера. */
  enabled: boolean;
  /** Модель OpenRouter. Задаётся только здесь, в коде не хардкодится. */
  model: string;
  /** Пометка с альтернативными моделями — для владельца проекта. */
  comment?: string;
  maxTokens: number;
  temperature: number;
  /** Таймаут запроса в миллисекундах. */
  timeoutMs: number;
  /** Промпт перевода с плейсхолдером {text}. */
  prompt: string;
}
