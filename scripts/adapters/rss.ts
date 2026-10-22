import Parser from 'rss-parser';
import type { Source } from '../../src/lib/types';
import type { RawMaterial } from '../normalize';

const parser = new Parser({
  timeout: 20_000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'LHvostBot/1.0 (+https://github.com/aitsvet710-ux/LHvost)'
  },
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure', 'content:encoded']
  }
});

/**
 * Собирает материалы из RSS/Atom-ленты.
 * Ошибки сети и битый XML не роняют весь скрипт — возвращается пустой массив.
 */
export async function collectRss(source: Source): Promise<RawMaterial[]> {
  if (!source.url) {
    console.warn(`  ⚠ У источника «${source.name}» не задан url — пропускаю`);
    return [];
  }

  try {
    const feed = await parser.parseURL(source.url);

    return (feed.items ?? []).map(item => {
      const raw = item as unknown as Record<string, unknown>;
      const media = (raw['media:content'] ?? raw['media:thumbnail']) as
        | { $?: { url?: string } }
        | undefined;
      const enclosure = raw.enclosure as { url?: string } | undefined;

      return {
        title: item.title ?? 'Без названия',
        url: item.link ?? source.url!,
        source: source.name,
        sourceType: 'rss' as const,
        publishedAt: item.isoDate ?? item.pubDate ?? '',
        description: item.contentSnippet ?? item.content ?? item.summary ?? undefined,
        imageUrl: media?.$?.url ?? enclosure?.url
      };
    });
  } catch (error) {
    console.warn(`  ⚠ RSS «${source.name}» недоступен: ${(error as Error).message}`);
    return [];
  }
}
