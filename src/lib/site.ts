import siteConfig from '../config/site.json';

/**
 * Конфигурация сайта — единственный источник брендинга.
 * Переименование дайджеста = правка одной строки в src/config/site.json.
 */
export interface SiteConfig {
  /** Название бренда. Используется в шапке, подвале, hero и метаданных. */
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

export const site: SiteConfig = siteConfig;

/** Название бренда. */
export function getSiteName(): string {
  return site.name;
}

/** Подзаголовок под названием. */
export function getTagline(): string {
  return site.tagline;
}

/**
 * Заголовок вкладки: на главной — полное название,
 * на внутренних страницах — «Заголовок страницы — Название».
 */
export function formatTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} — ${site.name}` : site.title;
}
