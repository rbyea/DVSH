export type WhatsNewItem = {
  date: string;
  title: string;
  points: string[];
};

/** Пункты с датой раньше этой прячутся за «какие ещё были». */
export type WhatsNewAnnouncement = {
  id: string;
  eyebrow: string;
  title: string;
  archiveBefore: string;
  items: WhatsNewItem[];
};

export function splitWhatsNewItems(announcement: WhatsNewAnnouncement): {
  fresh: WhatsNewItem[];
  archive: WhatsNewItem[];
} {
  const fresh: WhatsNewItem[] = [];
  const archive: WhatsNewItem[] = [];

  for (const item of announcement.items) {
    if (item.date >= announcement.archiveBefore) {
      fresh.push(item);
    } else {
      archive.push(item);
    }
  }

  return { fresh, archive };
}

export const currentWhatsNew: WhatsNewAnnouncement = {
  id: '2026-09-08-diagnostics',
  eyebrow: 'Что нового',
  title: 'Последние обновления',
  archiveBefore: '2026-09-08',
  items: [
    {
      date: '2026-09-08',
      title: 'Диагностика без заказ-наряда',
      points: [
        'На дашборде кнопка «Диагностика» рядом с «Новый ремонт»',
        'Поиск авто по госномеру, VIN или клиенту — по всем СТО',
        'Список осмотра можно завести без оформления заказа',
        'Клиенту сразу отдаётся публичная ссылка с результатами',
      ],
    },
    {
      date: '2026-09-08',
      title: 'Пароль и почта',
      points: [
        'Профиль → «Аккаунт»: смена пароля',
        'Экран входа: ссылка «Забыли пароль?»',
        'На почту придёт письмо со ссылкой на новый пароль',
        'Профиль → «Аккаунт»: подтвердите почту, иначе письмо восстановления некуда отправить',
      ],
    },
    {
      date: '2026-09-03',
      title: 'Осмотр автомобиля',
      points: [
        'Карточка авто: царапины, замены и рекомендации',
        'Пометка «сейчас» или «позже»',
        'Выбранное можно сразу унести в заказ-наряд',
      ],
    },
    {
      date: '2026-09-01',
      title: 'Пригласить другое СТО',
      points: ['Профиль: одноразовая ссылка', 'Регистрация по ней даёт вам 30 дней бесплатно'],
    },
    {
      date: '2026-08-25',
      title: 'Выплаты мастерам',
      points: ['Профиль → «Выплаты»: процент мастера', 'Закрытие смены и разовые доплаты'],
    },
    {
      date: '2026-08-24',
      title: 'Оплата тарифа',
      points: [
        'Профиль → «Тарифы» и «История оплат»',
        'Продлить доступ можно картой, не выходя из сервиса',
      ],
    },
    {
      date: '2026-08-12',
      title: 'Карточка для клиента',
      points: [
        'У автомобиля есть публичная ссылка',
        'Клиент видит статус и пробег без входа в сервис',
        'Может подтвердить смету по этой ссылке',
      ],
    },
  ],
};
