import type { RawMaterial } from './normalize';

/** Явный мусор: реклама, розыгрыши, вакансии, продажи. */
const AD_MARKERS = [
  'реклама',
  'рекламируем',
  'скидка',
  'акция',
  'распродажа',
  'розыгрыш',
  'конкурс',
  'вакансия',
  'требуется',
  'ищу работу',
  'куплю',
  'продаю',
  'объявление',
  'партнёрская',
  'промокод',
  'скидка по ссылке',
  't.me/+',
  'присоединяйтесь к нам в реклам',
  'advertisement',
  'sponsored',
  'coupon',
  'promo code',
  'save big',
  'shop now',
  'limited time offer',
  'sale ends',
  'discount code',
  'subscribe to our newsletter',
  'webinar registration'
];

/** Требования к содержанию — что делает материал практически полезным. */
const VALUE_MARKERS = [
  'обзор',
  'сравнение',
  'тест',
  'чертёж',
  'чертежи',
  'чертёж',
  'проект',
  'проекты',
  'изготовление',
  'сборка',
  'техника',
  'приём',
  'приёмы',
  'способ',
  'метод',
  'инструмент',
  'инструменты',
  'станок',
  'пила',
  'фрезер',
  'шлифов',
  'строгание',
  'циклевание',
  'точение',
  'фрезеровка',
  'пайка',
  'склейка',
  'финишная',
  'отделка',
  'лак',
  'масло',
  'воск',
  'безопасность',
  'охрана труда',
  'средства защиты',
  'пылесос',
  'вытяжка',
  'вред',
  'здоровье',
  'материал',
  'доска',
  'шпон',
  'фанера',
  'массив',
  'дуб',
  'ясень',
  'бук',
  'сосна',
  'шпунт',
  'финиш',
  'разбор',
  'разборка',
  'ошибки',
  'советы',
  'опыт',
  'мастер-класс',
  'урок',
  'румба',
  'инструмент-долж',
  'кондуктор',
  'сверлен',
  'самодельн',
  'своими руками',
  'приспособлени',
  'разбор',
  'мастер',
  'домашн',
  'рабочее место',
  'макуштур',
  // англоязычные маркеры
  'review',
  'comparison',
  'vs.',
  'tested',
  'how to',
  'how-to',
  'build',
  'building',
  'project',
  'plan',
  'plans',
  'workshop',
  'tool review',
  'tools',
  'router',
  'table saw',
  'chisel',
  'hand plane',
  'joinery',
  'mortise',
  'tenon',
  'dovetail',
  'finishing',
  'finish',
  'woodworking',
  'woodworker',
  'workbench',
  'cabinet',
  'cabinetmaking',
  'furniture',
  'shelf',
  'drawer',
  'hardwood',
  'oak',
  'walnut',
  'maple',
  'cherry',
  'plywood',
  'veneer',
  'glue',
  'clamping',
  'sanding',
  'sharpening',
  'safety',
  'dust collection',
  'protective equipment',
  'shop tour',
  'jig',
  'template',
  'measurement',
  'mistake',
  'mistakes',
  'tips',
  'technique',
  'masterclass',
  'lesson',
  'tutorial',
  'beginner'
];

/** Слишком короткие тексты не несут практической ценности. */
const MIN_LENGTH = 20;

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

/**
 * Отсеивает рекламу и материалы без практической ценности.
 */
export function isValuable(material: RawMaterial): FilterResult {
  const haystack = `${material.title} ${material.description ?? ''}`.toLowerCase();

  if (material.title.length < MIN_LENGTH) {
    return { passed: false, reason: 'слишком короткий заголовок' };
  }

  for (const marker of AD_MARKERS) {
    if (haystack.includes(marker)) {
      return { passed: false, reason: `рекламный маркер: «${marker}»` };
    }
  }

  const hasValue = VALUE_MARKERS.some(marker => haystack.includes(marker));
  if (!hasValue) {
    return { passed: false, reason: 'нет маркеров практической ценности' };
  }

  return { passed: true };
}

/**
 * Фильтрует массив материалов.
 */
export function filterMaterials(materials: RawMaterial[]): RawMaterial[] {
  return materials.filter(material => isValuable(material).passed);
}
