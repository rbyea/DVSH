# Telegram / MAX — уведомления о статусе ремонта (ТЗ для Laravel)

Фронт: React SPA (Автовидно / DVSH). Бэкенд: Laravel, база `/api/v1`.

Цель: клиент СТО подключает уведомления о статусе своего авто в Telegram (позже — в MAX) и получает
сообщения при смене статусов ремонта.

## Архитектура

```
Laravel
  └── NotificationService (единая точка отправки)
        ├── TelegramChannel  ← бот 1 (токен в env)
        └── MaxChannel       ← бот 2 (позже, тот же интерфейс)
              └── telegram_subscriptions
                    id | vehicle_id | chat_id | channel | created_at
```

- Бот-токены живут только в `.env` (`TELEGRAM_BOT_TOKEN=`, `TELEGRAM_WEBHOOK_URL=`). Никогда не
  отдаются на фронт.
- Каналы реализуются через общий интерфейс (`send(chatId, text)`), чтобы MAX добавить адаптером, не
  трогая логику.

## 1. Подключение клиента (deep link)

Бот не может писать первым — клиент должен нажать «Start».

Ссылка для клиента (генерирует фронт на публичной странице и в карточке ремонта):

```
https://t.me/<YourBot>?start=<public_token авто>
```

Поток:

1. Клиент открывает ссылку, жмёт Start.
2. Webhook: `POST /api/telegram/webhook` (update с `payload = public_token`).
3. Сервер находит `vehicles` по `public_token` → связывает `chat_id` с `vehicle_id` в
   `telegram_subscriptions` (upsert, `channel=telegram`).
4. Клиенту приходит приветствие: «Вы подключили уведомления о ремонте авто А123ВС77. Статус пришлём
   сюда.»
5. Если клиент запустил бота без payload — предложить ввести код авто / скинуть ссылку.

## 2. Миграция

```php
Schema::create('telegram_subscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
    $table->string('chat_id');
    $table->string('channel')->default('telegram'); // telegram | max
    $table->timestamps();
    $table->unique(['vehicle_id', 'channel']);
});
```

## 3. Триггеры отправки

Уведомление отправляется **после** успешной смены статуса ремонта (в сервисном слое / событиях
`RepairStatusChanged`):

| Событие                     | Текст клиенту                                                          |
| --------------------------- | ---------------------------------------------------------------------- |
| `status → new`              | «Заказ №123 принят. Авто: А123ВС77. Отслеживайте статус: {public_url}» |
| `status → pending_approval` | «Смета готова: {total} ₽. Подтвердить: {public_url}»                   |
| `estimate approved`         | «Смета подтверждена, приступаем к работе.»                             |
| `estimate declined`         | «Смета отклонена вами. Обсудим детали по телефону.»                    |
| `status → in_progress`      | «Автомобиль в работе.»                                                 |
| `status → waiting_parts`    | «Ждём запчасти.»                                                       |
| `status → done`             | «Ремонт готов! Авто можно забирать: {public_url}»                      |
| `status → completed`        | «Авто выдано. Пожалуйста, подтвердите: {public_url}»                   |
| `client_confirm → disputed` | «Вы указали ошибку. Мы её исправим и вернёмся.»                        |

Правила:

- Отправка только если для `vehicle_id` есть подписка.
- Повторная отправка при том же статусе — не выполняется (события только при реальной смене).
- Ошибка доставки (бот заблокирован и т.п.) — логируется, подписка помечается неактивной (колонка
  `is_active` миграцией, если нужно).

## 4. Эндпоинты для фронта

| Метод    | Путь                                                | Назначение                                                    |
| -------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `GET`    | `/repairs/{id}/notifications`                       | статус каналов клиента (список каналов с chat_id + is_active) |
| `GET`    | `/repairs/{id}/notifications/link?channel=telegram` | актуальная deep link (с токеном авто)                         |
| `DELETE` | `/repairs/{id}/notifications?channel=telegram`      | клиент отписался (удаляет подписку)                           |

Ответы — стандарт: `{ data: ... }`, ошибки 401/403/404/422.

## 5. Фронтенд (React, отдельная задача)

- Кнопка «Уведомлять в Telegram» на публичной странице `/public/vehicles/:token` и на панели
  публичной ссылки `/repairs/:id` → `window.open(deepLink)`.
- После возврата клиента — `refetch` статуса канала, показ «Уведомления подключены» (иконка/бейдж).
- Индикатор в карточке ремонта: какие каналы подключены у клиента.

## 6. Настройка бота

1. `@BotFather` → `/newbot` → токен в env.
2. `POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://domain/api/telegram/webhook`.
3. Один бот на окружение (dev/stage/prod).

## 7. MAX (мессенджер VK) — вторая итерация

- Та же таблица (`channel=max`), тот же `NotificationService`.
- Свой бот/механизм подключения по документации MAX (платформа VK).
- Фронт: вторая кнопка/переключатель канала; можно оба сразу.

## Приоритет

1. Telegram: webhook + подписки + триггеры на статусы ($; клиентский флоу).
2. Кнопки и индикаторы на фронте.
3. MAX-канал.
