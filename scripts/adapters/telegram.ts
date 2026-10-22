import type { Source } from '../../src/lib/types';
import type { RawMaterial } from '../normalize';

/**
 * Минимальный набор методов Telegram Client API, который использует адаптер.
 * Описан вручную, чтобы не зависеть от types пакета telegraf.
 */
interface TelegramClientLike {
  start(options: {
    phoneNumber: () => Promise<string>;
    code: () => Promise<string>;
    phoneCodeHash: () => Promise<string>;
  }): Promise<void>;
  getEntity(id: string): Promise<unknown>;
  getMessages(
    entity: unknown,
    options: { limit: number }
  ): Promise<{ id: number; date: number; text?: string }[]>;
  stop(): Promise<void>;
}

export function normalizeChannelName(name: string): string {
  return name.replace(/^https?:\/\/t\.me\//, '').replace(/^@/, '').trim();
}

export function channelUrl(name: string): string {
  return `https://t.me/${normalizeChannelName(name)}`;
}

/**
 * Публичная лента Telegram-канала через t.me/s/<channel>.
 * Не требует авторизации и работает для открытых каналов.
 */
export async function collectTelegramPublic(source: Source): Promise<RawMaterial[]> {
  const channel = normalizeChannelName(source.name);
  const url = `https://t.me/s/${channel}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`  ⚠ Telegram «${source.name}»: статус ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseTelegramHtml(html, channel, source.name);
  } catch (error) {
    console.warn(`  ⚠ Telegram «${source.name}» недоступен: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Разбирает HTML публичной ленты t.me/s.
 */
export function parseTelegramHtml(
  html: string,
  channel: string,
  sourceName: string
): RawMaterial[] {
  const results: RawMaterial[] = [];

  const postPattern =
    /<div class="tgme_widget_message[^"]*"[\s\S]*?data-post="([^"]+)"[\s\S]*?<time[^>]*datetime="([^"]+)"[\s\S]*?<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;

  let match: RegExpExecArray | null;
  while ((match = postPattern.exec(html)) !== null) {
    const [, postId, datetime, body] = match;
    const text = body
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const title = text.length > 0 ? text.split(/(?<=[.!?])\s/)[0].slice(0, 140) : 'Пост из Telegram';

    results.push({
      title,
      url: `https://t.me/${postId}`,
      source: sourceName,
      sourceType: 'telegram' as const,
      publishedAt: datetime,
      description: text
    });
  }

  if (results.length === 0 && /tgme_channel_error|channel is private|tgme_page_icon/i.test(html)) {
    console.warn(`  ⚠ Telegram «${sourceName}» (@${channel}) недоступен или закрыт`);
  }

  return results;
}

/**
 * Сбор через Telegram Client API (требует api_id/api_hash и сессию).
 * Используется, только если заданы TELEGRAM_SESSION, TELEGRAM_API_ID и
 * TELEGRAM_API_HASH и установлен пакет telegraf. Иначе — публичная лента.
 */
export async function collectTelegramViaApi(source: Source): Promise<RawMaterial[]> {
  const session = process.env.TELEGRAM_SESSION;
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!session || !apiId || !apiHash) {
    console.warn(
      `  ⚠ Для «${source.name}» не заданы TELEGRAM_API_ID/HASH/SESSION — использую публичную ленту`
    );
    return collectTelegramPublic(source);
  }

  try {
    // Спецификатор через переменную: пакет telegraf ставится по желанию,
    // поэтому статический импорт ломал бы проверку типов.
    const specifier = 'telegraf';
    const { TelegramClient } = (await import(specifier)) as {
      TelegramClient: new (
        session: string,
        apiId: string,
        apiHash: string
      ) => TelegramClientLike;
    };
    const client = new TelegramClient(session, apiId, apiHash);
    await client.start({
      phoneNumber: async () => process.env.TELEGRAM_PHONE ?? '',
      code: async () => '',
      phoneCodeHash: async () => ''
    });

    const channel = normalizeChannelName(source.name);
    const entity = await client.getEntity(
      channel.startsWith('-100') ? channel : `-100${channel.replace('-', '')}`
    );

    const messages = await client.getMessages(entity, { limit: 30 });
    const results: RawMaterial[] = [];

    for (const message of messages) {
      const text = message.text ?? '';
      if (!text) continue;
      results.push({
        title: text.split(/(?<=[.!?])\s/)[0].slice(0, 140),
        url: `https://t.me/${channel}/${message.id}`,
        source: source.name,
        sourceType: 'telegram' as const,
        publishedAt: new Date(message.date * 1000).toISOString(),
        description: text
      });
    }

    await client.stop();
    return results;
  } catch (error) {
    console.warn(
      `  ⚠ Telegram API «${source.name}»: ${(error as Error).message} — откат на публичную ленту`
    );
    return collectTelegramPublic(source);
  }
}
