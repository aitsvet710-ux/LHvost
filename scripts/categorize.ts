import type { Category } from '../src/lib/types';
import type { RawMaterial } from './normalize';

interface CategoryRule {
  category: Category;
  keywords: string[];
}

/**
 * Порядок важен: более специфичные рубрики стоят выше общих,
 * при равенстве весов побеждает первая сработавшая.
 */
export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'Безопасность',
    keywords: [
      'безопасность', 'охрана труда', 'средства защиты', 'перчатки', 'респиратор',
      'пылесос', 'вытяжка', 'вред', 'здоровье', 'позвоночник', 'шум',
      'безопасн', 'защита', 'травма', 'предупреждение',
      // английский
      'safety', 'dust collection', 'dust collector', 'protective equipment',
      'respirator', 'hearing protection', 'workplace safety', 'shop safety',
      'fume', 'extraction', 'ppe', 'ventilation', 'injury', 'hazard'
    ]
  },
  {
    category: 'Инструмент',
    keywords: [
      'инструмент', 'станок', 'пила', 'фрезер', 'шлифов', 'строган',
      'точение', 'дрель', 'шуруповерт', 'перфоратор', 'цикле',
      'ручной инструмент', 'электро', 'аппарат', 'оснастк', 'пилы',
      'фрезы', 'нож', 'стамеск', 'калибр', 'обзор инструмента', 'сравнение',
      // английский
      'tool review', 'tool comparison', 'best tools', 'saw', 'router',
      'chisel', 'hand plane', 'plane', 'drill', 'grinder', 'sharpener',
      'lathe', 'band saw', 'table saw', 'jointer', 'sander', 'workbench',
      'blade', 'bit', 'cutter', 'fret saw', 'rasp', 'file', 'scraper'
    ]
  },
  {
    category: 'Проект/чертёж',
    keywords: [
      'чертёж', 'чертежи', 'чертёж', 'проект', 'проекты', 'изготовление',
      'сборка', 'мебель', 'стол', 'шкаф', 'тумба', 'полка', 'ящик',
      'дверь', 'лестниц', 'стеллаж', 'верстак', 'поделк', 'изделие',
      'раскрой', 'присадк', 'фрезеровка деталей', 'своими руками',
      // английский
      'build a', 'building a', 'project plan', 'cut list', 'materials list',
      'furniture', 'cabinet', 'bookcase', 'side table', 'coffee table',
      'dining table', 'desk', 'workbench build', 'tool chest', 'dovetail',
      'drawer', 'shelf', 'bench', 'step stool', 'toy box', 'planter'
    ]
  },
  {
    category: 'События/выставки',
    keywords: [
      'выставк', 'фестиваль', 'конференц', 'мастер-класс', 'событи',
      'встреча', 'ярмарк', 'шоу', 'демо', 'турнир', 'забег', 'лекц',
      'семинар', 'обучени', 'курс', 'заняти', 'марафон',
      // английский
      'exhibition', 'trade show', 'conference', 'meetup', 'workshop class',
      'fair', 'expo', 'demonstration', 'lecture', 'seminar', 'symposium',
      'class', 'course', 'contest', 'competition'
    ]
  },
  {
    category: 'Техника и приёмы',
    keywords: [
      'техника', 'приём', 'приёмы', 'способ', 'метод', 'лайфхак',
      'рецепт', 'приклейк', 'склейк', 'шпакл', 'шпатлёв', 'краск',
      'финишн', 'отделк', 'лак', 'масл', 'воск', 'морилк', 'патинир',
      'фрезеровк', 'циклевани', 'точи', 'шлифовк', 'сверлени', 'пил',
      'струбц', 'фрезерн', 'кондуктор', 'шаблон', 'приспособлени', 'оснастк',
      'разбор ошибок', 'ошибки', 'советы', 'опыт', 'урок',
      // английский
      'technique', 'tip', 'trick', 'method', 'process', 'step by step',
      'how it works', 'joinery', 'mortise and tenon', 'dovetail',
      'finishing', 'finish', 'stain', 'oil finish', 'wax', 'lacquer',
      'sanding', 'sharpening', 'clamping', 'glue-up', 'glue up',
      'cutting', 'ripping', 'join', 'scraping', 'chamfer', 'mortising',
      'jig', 'fixture', 'template', 'router table', 'workholding',
      'mistake', 'mistakes', 'problem solving'
    ]
  },
  {
    category: 'Вдохновение',
    keywords: [
      'вдохновен', 'красив', 'идея', 'дизайн', 'фото', 'подборк',
      'галерея', 'истории', 'ремесло', 'мастер', 'размышлени', 'мысли',
      // английский
      'inspiration', 'beautiful', 'design', 'gallery', 'showcase',
      'collection', 'artist', 'craftsman', 'studio visit', 'history',
      'photography', 'ideas', 'aesthetic'
    ]
  }
];

/**
 * Определяет рубрику материала.
 */
export function categorize(material: RawMaterial): Category {
  const haystack = `${material.title} ${material.description ?? ''}`.toLowerCase();

  let best: { category: Category; score: number } | null = null;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword)) score += keyword.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { category: rule.category, score };
    }
  }

  return best?.category ?? 'Техника и приёмы';
}

/**
 * Извлекает теги (до 4 штук) из заголовка и описания.
 */
export function extractTags(material: RawMaterial): string[] {
  const haystack = `${material.title} ${material.description ?? ''}`.toLowerCase();
  const vocabulary = [
    'фрезеровка', 'циклевание', 'точение', 'шлифовка', 'строгание',
    'распил', 'пиление', 'склейка', 'шпатлёвка', 'окраска', 'лак',
    'масло', 'воск', 'морилка', 'дуб', 'ясень', 'бук', 'сосна',
    'массив', 'шпон', 'фанера', 'ЛДСП', 'МДФ', 'фреза', 'пила',
    'циркулярка', 'фрезер', 'шлифмашина', 'станок', 'верстак', 'стол',
    'шкаф', 'тумба', 'ящик', 'полка', 'лестница', 'дверь', 'стеллаж',
    'сборочный чертёж', 'оснастка', 'кондуктор', 'шаблон',
    // английский
    'router', 'planing', 'turning', 'sanding', 'saw', 'chisel',
    'joinery', 'dovetail', 'mortise', 'tenon', 'cabinet', 'workbench',
    'table saw', 'hand plane', 'finishing', 'clamping', 'glue-up',
    'hardwood', 'plywood', 'veneer', 'jig', 'template', 'sharpening',
    'dust collection', 'furniture', 'drawer', 'shelf', 'door'
  ];

  const tags = vocabulary.filter(word => haystack.includes(word));
  return tags.slice(0, 4);
}
