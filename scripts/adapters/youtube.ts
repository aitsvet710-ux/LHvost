import type { Source } from '../../src/lib/types';
import type { RawMaterial } from '../normalize';

/**
 * Собирает свежие видео с YouTube-канала через RSS-мост.
 * Не требует API-ключа — используется фирменная лента канала.
 */
export async function collectYoutube(source: Source): Promise<RawMaterial[]> {
  const channelId = source.url ?? source.name;
  if (!channelId) {
    console.warn(`  ⚠ У источника «${source.name}» не задан channel_id — пропускаю`);
    return [];
  }

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LHvostBot/1.0' }
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`  ⚠ YouTube «${source.name}»: статус ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const entries = xml.split('<entry>').slice(1);

    return entries.map(entry => {
      const title = decodeXml(pick(entry, '<title>'));
      const link = pick(entry, '<yt:videoId>');
      const published = pick(entry, '<published>');
      const author = decodeXml(pick(entry, '<author>'));

      return {
        title: title || 'Видео с YouTube',
        url: link ? `https://www.youtube.com/watch?v=${link}` : (source.url ?? ''),
        source: source.name,
        sourceType: 'youtube' as const,
        publishedAt: published || new Date().toISOString(),
        description: author ? `Автор: ${author}` : undefined,
        contentType: 'видео' as const
      };
    });
  } catch (error) {
    console.warn(`  ⚠ YouTube «${source.name}» недоступен: ${(error as Error).message}`);
    return [];
  }
}

function pick(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`${tag}>([\\s\\S]*?)</${tag.replace(':', '\\:')}>`));
  return match ? match[1].trim() : '';
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
