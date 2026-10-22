# AGENTS.md

Правила проекта «Ласточкин хвост». Действуют для всех правок — и humans, и агентов.

## 1. Что это

Дайджест столярного ремесла: статический сайт Astro + Tailwind v4, конвейер сбора материалов на
TypeScript, деплой на GitHub Pages.

## 2. Структура

| Путь | Назначение |
| --- | --- |
| `src/config/site.json` | Бренд: название, подзаголовок, описание, ссылка на сообщество |
| `src/config/sources.json` | Источники: Telegram, RSS, YouTube |
| `src/config/ai.json` | Модели суммаризации и перевода, промпты, таймауты |
| `src/lib/types.ts` | Типы домена: `Category`, `ContentType`, `SourceType`, `Material` |
| `src/lib/utils.ts` | `withBase`, склонения, относительная дата, время чтения, слаги |
| `src/lib/data.ts` | Доступ к материалам: список, свежий выпуск, поиск по слагу |
| `src/lib/categories.ts` | Справочник рубрик: слаг, цвета, иконки |
| `src/lib/covers.ts` | Обложки: путь по рубрике, точка расширения для генерации |
| `src/styles/global.css` | `@theme` с палитрой и `@utility` с повторяемыми стилями |
| `scripts/collect.ts` | Точка входа конвейера |
| `scripts/adapters/` | Источники: telegram.ts, rss.ts, youtube.ts |
| `scripts/ai/` | summarize.ts, translate.ts |
| `data/materials.json` | Собранные материалы (коммитится) |

## 3. Инварианты — не нарушать никогда

1. **Ссылки.** Все внутренние ссылки — через `withBase()` из `src/lib/utils.ts`. Голые
   `href="/..."` сломаются на GitHub Pages из-за base path.
2. **Tailwind v4.** Тема — CSS-first в `@theme` (`src/styles/global.css`). Файла
   `tailwind.config.mjs` не существует и не появится. Повторяемые стили — через `@utility`, а не
   `@layer components`: v4 не резолвит `@apply` по обычным классам.
3. **Секреты.** Ключи и токены — только в `.env`, никогда не коммитить. `.env.example` —
   только имена переменных без значений.
4. **Устойчивость.** `npm run collect` не падает на пустых или битых ответах, отсутствии ключа,
   таймаутах. Любая внешняя интеграция — с fallback.
5. **Язык.** Весь пользовательский текст, alt, aria-label, title и комментарии — на русском.
   Никаких «Read more», «Tags», «Archive».
6. **Рубрики.** Новая рубрика: union `Category` в `src/lib/types.ts` → keywords в
   `scripts/categorize.ts` → метка в `src/components/Tag.astro`. Существующие не переименовывать.
7. **Качество.** `npm audit` = 0. Actions запинены на SHA. markdownlint — 0 замечаний, yaml-lint —
   валидно.
8. **Ветки.** `main` защищена: feature-ветка + PR + squash-merge. Conventional Commits. Без
   force-push.
9. **Диффы.** Минимальный дифф. Не переписывать то, что работает. Не смешивать фазы в одном PR.

## 4. Команды

```bash
npm install            # зависимости
npm run dev            # локальная разработка
npm run build          # сборка в dist/
npm run collect        # конвейер сбора → data/materials.json
npm audit              # должно быть 0 уязвимостей
```

## 5. Как добавить источник

1. Описать источник в `src/config/sources.json` с `"enabled": true`.
2. Если готового адаптера нет — создать `scripts/adapters/<тип>.ts` и подключить его в
   `scripts/collect.ts`.
3. Адаптер обязан изолировать сбой: бросать исключение или возвращать пустой массив, но не
   ломать весь сбор.

Смена источника = правка `collect.ts` и/или добавление адаптера. UI и страницы о внешних
источниках не знают.

## 6. Как отключить перевод

В `src/config/ai.json`, блок `translation`: `"enabled": false`. Модель перевода задаётся только
там — в коде она не зашита. Кэш — `scripts/cache/translations.json`, коммитится; повторный сбор
не делает новых запросов к API.

## 7. Конвенции обложек

- Файлы обложек рубрик: `public/images/categories/<слаг-рубрики>.webp`, запасная —
  `public/images/categories/default.webp`.
- Слаг рубрики берётся из `CATEGORY_META` в `src/lib/categories.ts`.
- Формат — 16:9, не менее 1600×900, без битых ссылок.
- Источники — royalty-free (Unsplash, Pexels) либо собственные аккуратные иллюстрации. Лицензия
  указывается в этом файле при добавлении новой обложки.
- Генерация обложек по `IMAGE_GEN_API_KEY` — точка расширения в `src/lib/covers.ts`, реализуется
  владельцем проекта.

## 8. Процесс правки

1. Ветка от `main`: `feature/<короткое-имя>`.
2. Минимальный дифф, одна фаза за раз.
3. Проверки: `npm run build`, `npm run collect` (где применимо), `npm audit`, markdownlint,
   yaml-lint, grep на инварианты.
4. Обновить `README.md` и `AGENTS.md`, если изменились команды или структура.
5. PR с описанием «что / зачем / как проверить», зелёный CI, squash-merge.
