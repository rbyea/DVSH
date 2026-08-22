---
SOURCE FILE: docs/BACKEND-TASKS.md
---

# Backend: пул задач (сводно, 19.08.2026)

Единый список задач для Laravel-бэкенда. Детали каждого пункта — в указанном файле ТЗ.

Базовый URL: `/api/v1`. Формат ответов: `{ "data": ... }`.

Статусы: **[Д] — сделано/выкачено**, **[Н] — не сделано, делаем**.

---

## Блок 1. Новые требования (вне предыдущих хендоффов)

### 1.1 [Н] MAX-бот: уведомления о статусе ремонта

**Файл ТЗ:** `docs/backend-max-notifications.md`

- Бот «Автовидно» создан и работает (`https://max.ru/id650202270142_bot`), токен в `.env`
- Webhook `POST /api/max/webhook` (подписка на события MAX: `bot_started`, `message_created`,
  `message_callback`, `bot_stopped`)
- Таблица `notification_subscriptions` (`vehicle_id → chat_id/user_id, channel`, unique)
- Привязка клиента: кнопка `request_contact` → проверка `HMAC-SHA256(token, vcf_info) === hash` →
  поиск клиента по номеру → подписка на все его авто
- Уведомления по смене статусов (new, pending_approval, estimate approved/declined, in_progress,
  waiting_parts, done, completed, client_confirm disputed)
- **Состав каждого сообщения: название автосервиса (СТО) + номер заказа; в `done`/`completed` —
  список выполненных работ (`work_items`)** (детали — §5 «Состав сообщения»)
- Эндпоинты для фронта: `GET /repairs/{id}/notifications`,
  `GET /repairs/{id}/notifications/link?channel=max`,
  `DELETE /repairs/{id}/notifications?channel=max`
- Фронт готов: кнопки «Уведомлять в MAX» на публичке и в карточке ремонта

### 1.2 [Н] Public: `client_vehicles` + `ordered_parts` в истории

**Файл ТЗ:** `docs/backend-handoff-public-vehicles.md`

- `GET /public/vehicles/{token}` → `client_vehicles`: все авто клиента с `public_token` (сейчас поле
  не приходит, блок «Ваши автомобили» скрыт)
- `previous_repairs[]` → `ordered_parts` (name, quantity, price) — фронт уже выводит запчасти с
  ценами и включает их в сумму
- Проверка: открыть публичную страницу — блок авто и запчасти в «Истории по авто»

---

## Блок 2. Из хендоффа 18.08 — проверка, что выкачено

### 2.1 [Д] Согласование работ без обязательной суммы

**Файл:** `docs/backend-handoff-2026-08-18.md` (§1)

- `repair_orders.total` nullable; `pending_approval` + `estimate_status=pending` без `total`
- Идемпотентность повторного `pending`; повторная отправка после declined сбрасывает
  `estimate_comment`/`estimate_decided_at`
- Публичное решение (`approved`/`declined`) при `total=null`, `comment` обязателен при declined

### 2.2 [Д] Создание авто для существующего клиента

**Файлы:** `docs/backend-handoff-2026-08-18.md` (§2), `docs/backend-create-vehicle.md`

- `POST /clients/{clientId}/vehicles` — создание авто с привязкой к станции клиента
- Валидация: VIN или шасси (одно из двух), дубли госномера → 422, ответ 201 с `id`

---

## Блок 3. Ранее согласованные задачи — берём в работу

### 3.1 [Н] Подтверждение клиентом после «Выдан»

**Файл:** `docs/backend-client-confirm.md` / `docs/BACKEND-HANDOFF.md` (§1)

- `completed` → `client_confirm_status=pending`; клиент подтверждает/оспаривает по публичной ссылке
  (`POST /public/vehicles/{token}/confirm`)
- pending/confirmed → staff read-only; disputed → можно править и вернуть в pending
- `client_name` в public current_repair

### 3.2 [Н] История авто: `work_items[]` + `mileage` по визитам

**Файл:** `docs/backend-vehicle-history-works.md` / `BACKEND-HANDOFF.md` (§2)

- `GET /vehicles/{id}` → `repairs[]` и `previous_repairs[]`: полный список работ + пробег заказа

### 3.3 [Н] Пробег: серверная проверка минимума

**Файл:** `docs/backend-mileage.md` / `BACKEND-HANDOFF.md` (§3)

- `mileage < last_completed_mileage` → 422; floor обновляется при `status → completed`

### 3.4 [Н] Номер шасси `chassis_number`

**Файл:** `docs/backend-chassis-number.md` / `BACKEND-HANDOFF.md` (§4)

- VIN или шасси обязательны (одно из двух), поле в staff/public ответах

### 3.5 [Н] Комментарий мастера в публичном API

**Файл:** `docs/BACKEND-GO-LIVE.md` (§1)

- `GET /public/vehicles/{token}` → `current_repair.comment` (или null)

### 3.6 [Н] Несколько автомобилей клиента

**Файл:** `docs/backend-multi-vehicle.md`

- История и переключение между авто клиента на публичке

### 3.7 [Н] Мастера: список/назначение

**Файл:** `docs/backend-masters.md`

- `GET /masters` (активные, с specialty), маппинг обновлений по видам/статусам заказов

---

## Блок 4. Go-live (предоставить при выдаче в СТО)

### 4.1 [Н] Go-live: очистка демо-данных, аккаунты

**Файл:** `docs/BACKEND-GO-LIVE.md` (§2)

- Удаление тестовых клиентов/авто/ремонтов, создание `sto@sto.ru` / `password` на своей станции

---

## Рекомендуемый порядок

1. **1.1** MAX-бот (ключевой контур клиентских уведомлений; фронт готов)
2. **1.2** `client_vehicles` + `ordered_parts` (мелкие добавки в ответы, чинит видимые блоки)
3. **Блок 3** — сделать всё, чего ещё нет (фронт готов)
4. **4.1** — по готовности к выдаче в СТО

---

SOURCE FILE: docs/backend-handoff-2026-08-18.md
---

# Передача бэкенду — сегодня (2 задачи)

Фронт (React SPA «Автовидно») уже готов под эти контракты. Реализуй в Laravel по порядку приоритета.

Базовый URL: `/api/v1`, ответы оборачиваются в `{ "data": ... }`.

---

## Приоритет

1. **Согласование работ без «сметы»** — §1 (сейчас это главный флоу для клиента)
2. **Создание авто для существующего клиента** — §2

---

# §1. Согласование работ вместо «сметы»

## Продукт (что изменилось)

Убрали понятие «Смета для клиента» из карточки ремонта. Вместо этого:

- При создании ремонта фронт **сразу отправляет список работ клиенту на согласование**:
  `estimate_status=pending` + `status=pending_approval`.
- Клиент по публичной ссылке **подтверждает или отклоняет список работ** — без обязательной суммы.
  `total` может быть `null`.
- Сумма (`total`) остаётся опциональным полем, но от неё **не зависят** ни `pending`, ни решение
  клиента.
- СТО может отправить повторно (например, после `declined`) — «Отправить снова».

## Правила `estimate_status`

`null` | `pending` | `approved` | `declined`

1. `pending` ставится **без требования `total`** (раньше требовалось иметь сумму).
2. Идемпотентность: повторный `pending` при уже `pending`/`approved` — **не сбрасывать** в `pending`
   (просто игнорировать или вернуть текущее состояние, ошибка не нужна).
3. `pending` разрешён при наличии `work_items` (пустой список — допустимо, но нетипично).
4. Пока `pending`: нельзя `is_done`, нельзя `done`/`completed` (403/422) — без изменений.
5. Просто сохранить `total` **не** ставит `pending` — без изменений.
6. `approved|declined` → `status=in_progress` (если был `pending_approval`) — без изменений.

## Точки API

### `PATCH /repairs/{id}` (auth, staff) — уже существует

Фронт шлёт для отправки на согласование:

```json
{
  "status": "pending_approval",
  "estimate_status": "pending"
}
```

- Принять оба поля одним запросом.
- Авто-отправка: сразу после `POST /repairs` фронт делает этот `PATCH` (при создании ремонта).
  Нужно, чтобы он проходил идемпотентно: если ремонт только что создан и `estimate_status=null` →
  ставим `pending` + `pending_approval`.

### `POST /public/vehicles/{token}/estimate` (public) — уже существует

```json
{ "decision": "approved" | "declined", "comment": "..." }
```

- `comment` обязателен при `declined` — без изменений.
- Только если `estimate_status=pending` — без изменений.
- Решение принимается по **списку работ**; `total` при этом может быть `null` — принять.

## Поля в ответах (должны быть и без суммы)

### Staff `GET /repairs/{id}` / public `GET /public/vehicles/{token}` → `current_repair`

```json
{
  "order_number": "Р-1053",
  "status": "pending_approval",
  "status_label": "На согласовании",
  "estimate_status": "pending",
  "estimate_comment": null,
  "estimate_decided_at": null,
  "total": null,
  "work_items": [
    { "title": "Замена масла", "is_done": false },
    { "title": "Замена фильтров", "is_done": false }
  ]
}
```

Ни одно из полей (кроме `total`) не должно пропадать при `total=null`.

## Acceptance §1

- [ ] `PATCH /repairs/{id}` с `{ status: "pending_approval", estimate_status: "pending" }` работает
      сразу после создания ремонта (и без `total`)
- [ ] повторная отправка при `pending`/`approved` не сбрасывает статус
- [ ] публичное решение `approved|declined` работает при `total=null`
- [ ] пока `pending` — staff не может закрыть/выдать ремонт
- [ ] `estimate_status`, `estimate_comment`, `estimate_decided_at` есть в staff- и public-ответах
      при `total=null`

---

# §2. Создание авто для существующего клиента

## Проблема

На `/repairs/new` (панель «Автомобили клиента», кнопка «Добавить авто») и в карточке ремонта фронт
пробует `POST /clients/{id}/vehicles`, при 404/405/HTML-ответе — фоллбэк на `POST /vehicles`. Сейчас
**ни один из эндпоинтов не создаёт запись** → «ничего не добавляется».

## Требуемый эндпоинт

### `POST /clients/{clientId}/vehicles` (auth, staff)

Создаёт автомобиль и привязывает к клиенту **той же станции**.

Body (ровно то, что шлёт фронт):

```json
{
  "client_id": 123,
  "car_model": "Toyota Camry",
  "license_plate": "А123ВС777",
  "vin": "JTDBE32K600000000",
  "chassis_number": null,
  "mileage": 85000,
  "client_name": "Иван Петров",
  "client_phone": "+79990001122",
  "client_email": "ivan@mail.ru"
}
```

| Поле                                            | Тип            | Обязательное | Примечание                                                                                                    |
| ----------------------------------------------- | -------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `client_id`                                     | int/string     | да           | может дублировать clientId из URL                                                                             |
| `car_model`                                     | string         | да           |                                                                                                               |
| `license_plate`                                 | string         | да           | госномер РФ, нормализация                                                                                     |
| `vin`                                           | string \| null | см. ниже     | 17 симв., без I/O/Q                                                                                           |
| `chassis_number`                                | string \| null | см. ниже     | 5–25 симв., латиница/цифры                                                                                    |
| `mileage`                                       | int \| null    | нет          | ≥ 0                                                                                                           |
| `client_name` / `client_phone` / `client_email` | string \| null | нет          | можно игнорировать (фронт шлёт для совместимости со старым `POST /vehicles`); нового клиента **не создавать** |

**Валидация VIN/шасси:** допустимо ровно одно из двух (VIN **или** номер шасси). Если оба
null/пустые → 422.

**Ограничение:** клиент должен принадлежать `service_station_id` текущего пользователя, иначе
403/404.

## Ответ: 201

```json
{
  "data": {
    "id": 123,
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС777",
    "vin": "JTDBE32K600000000",
    "chassis_number": null,
    "mileage": 85000
  }
}
```

`id` обязателен — фронт без него показывает «Сервер не вернул id автомобиля».

## Ошибки

| Код | Случай                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------ |
| 401 | не авторизован                                                                                                           |
| 403 | клиент с другой станции                                                                                                  |
| 404 | клиент не найден                                                                                                         |
| 422 | пустая `car_model`; неверный `license_plate`; нет ни VIN, ни шасси; неверный VIN/шасси; `mileage` не число/отрицательный |

422 — стандартный формат `{ "message": "...", "errors": { "field": ["msg"] } }` (фронт мапит на поля
формы).

## Примечания

- После реализации эндпоинта фоллбэк `POST /vehicles` фронту не понадобится (он уйдёт на
  `/clients/{clientId}/vehicles`).
- Данные клиента при создании авто **не терять**.
- Дубли госномера: если номер уже есть у клиента станции — допустимо 422 или вернуть существующее
  авто (обязательно с `id`); решение на бэкенде.
- Пробег: при `mileage` применить правило минимального пробега (floor), если оно уже внедрено (см.
  §3 в `BACKEND-HANDOFF.md`).

## Acceptance §2

- [ ] `POST /clients/{id}/vehicles` создаёт авто и привязывает к клиенту
- [ ] без VIN и без шасси → 422
- [ ] клиент чужой станции → 403/404
- [ ] ответ 201 c `data.id`
- [ ] форма «Добавить авто» на `/repairs/new` и в карточке ремонта сохраняет авто

---

# Чеклист «можно отдавать фронту»

- [ ] §1: `pending` без `total`, идемпотентность, публичное решение без суммы, поля в ответах
- [ ] §2: `POST /clients/{id}/vehicles` с валидацией и привязкой к станции

---

# Вне объёма (на будущее)

- **Telegram-бот** — уведомления о статусе ремонта, **сегодня не делаем**. Но бот уже создан:

  - Username: `@avtovidno_bot`
  - Токен (секрет, не публиковать): `8671297224:AAHYDmx8sDtPtyTDTYTKBzsUMcD29VrYQXo`
  - Команды: `start` — «Подключить уведомления о ремонте», `status` — «Узнать текущий статус авто»,
    `help` — «Справка по боту»
  - Webhook (когда бэкенд будет готов):
    `POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://autovidno.tw1.ru/api/telegram/webhook`
  - Deep link для клиентов: `https://t.me/avtovidno_bot?start=<public_token авто>`
  - Полное ТЗ: `docs/backend-telegram-notifications.md`

  **ВНИМАНИЕ:** этот файл содержит токен бота — он в `.gitignore`, не коммитить и не выкладывать.

---

## Коротко для исполнителя

1. `estimate_status=pending` теперь ставится **без суммы**; повторные отправки не сбрасывают
   `approved`; клиент подтверждает список работ по публичной ссылке.
2. Реализуй `POST /clients/{clientId}/vehicles` (VIN **или** шасси обязательно, клиент — той же
   станции, ответ 201 с `id`).

и в конце созщдай md файл с списком того, что ты сделал

---

SOURCE FILE: docs/backend-handoff-public-vehicles.md
---

# Handoff фронт → бэкенд (18.08.2026)

Запросы от фронта по публичной карточке клиента `/public/vehicles/{token}`.

## 1. `client_vehicles` не приходит, клиент не видит свои авто

**Проблема.** На странице `/public/vehicles/XyJwITVtnXAGK0lv0L1GvjCJMh2U6HKz` блок «Ваши автомобили»
не показывается. Фронт рендерит его только при `client_vehicles.length > 0`
(`PublicVehicle.client_vehicles`, тип `PublicClientVehicleSummary`).

**Требование.** `GET /public/vehicles/{token}` должен возвращать `client_vehicles` — список всех
автомобилей клиента (включая текущий), каждый с полями:

```json
{
  "client_vehicles": [
    {
      "public_token": "строка",
      "car_model": "Toyota Camry",
      "license_plate": "А123ВС777",
      "vin": "JTDBE32K600000000",
      "chassis_number": null
    }
  ]
}
```

Без этого поля клиент не видит переключение между своими машинами (блок целиком скрыт).

## 2. `ordered_parts` в истории ремонтов

**Требование.** В `previous_repairs` для каждого заказ-наряда возвращать `ordered_parts` (название,
quantity, price) — фронт уже выводит список запчастей с ценами и включает их в сумму заказ-наряда.
Сейчас, если бэкенд не отдаёт поле, блок запчастей не показывается, а сумма считается без запчастей.

```json
{
  "previous_repairs": [
    {
      "order_number": "123",
      "ordered_parts": [
        { "name": "Колодки передние", "quantity": 1, "price": 3500 },
        { "name": "Масло 5W-30", "quantity": 4, "price": 1200 }
      ]
    }
  ]
}
```

## Текущий статус фронта

- Блок «Ваши автомобили» (переименован с «Автомобили клиента») готов и ждёт данных.
- Список запчастей в истории с ценами готов (тип `PublicRepairHistoryItem.ordered_parts`).
- Проверка после деплоя: открыть `/public/vehicles/{token}` — должен появиться блок авто и запчасти
  в «Истории по авто».

---

SOURCE FILE: docs/backend-max-notifications.md
---

# MAX — уведомления о статусе ремонта (ТЗ для Laravel)

Канал уведомлений клиента в мессенджере **MAX** (VK). Telegram-версия (старый файл
`backend-telegram-notifications.md`) отложена: `api.telegram.org` заблокирован для клиентов из РФ.

Фронт: React SPA (Автовидно / DVSH). Бэкенд: Laravel, база `/api/v1`.

## Архитектура

```
Laravel
  └── NotificationService (единая точка отправки)
        ├── MaxChannel            ← бот «Автовидно» (токен в env)
        └── (TelegramChannel — позже, тот же интерфейс)
              └── notification_subscriptions
                    id | vehicle_id | chat_id | user_id | channel | is_active | created_at
```

- Токен бота живёт только в `.env` (`MAX_BOT_TOKEN=`). Никогда не отдаётся на фронт.
- MAX API: домен `https://platform-api2.max.ru`, аутентификация — заголовок `Authorization: <token>`
  (передача токена в query не поддерживается).
- **Внимание**: API MAX использует сертификат Минцифры — на сервере добавить его в доверенные.
- Лимит: не более 2 сообщений/сек в один диалог.

## 1. Данные бота

- Имя: **Автовидно**
- Username: `id650202270142_bot`
- Ссылка на диалог с ботом: `https://max.ru/id650202270142_bot`
- Описание: «Уведомления о ремонте вашего авто»
- Токен: раздел платформы **business.max.ru/self → Чат-боты → Расширенные настройки → Настроить**
- Текущий токен (на 19.08.2026):
  `f9LHodD0cOLN_6cyOGkTOft1yKevqU_kVP_l0y021SNjEibbKUrAe8zLQZqhl7Wh2z5uGivxA-pmTqoPDQIX` → положить
  в `.env` (`MAX_BOT_TOKEN=...`), **не коммитить в git**; после подключения бэкенда желательно
  перегенерировать (этот экземпляр уже засветился в чате/доках)

## 2. Подключение клиента (без start-параметра)

В MAX **нет** deep-link с payload как в Telegram (`?start=`), поэтому привязка идёт по номеру
телефона:

1. Клиент нажимает на публичной карточке авто кнопку «Уведомлять в MAX» → открывается
   `https://max.ru/id650202270142_bot`.
2. Клиент нажимает **Start**, бот приветствует и отправляет кнопку `request_contact` («Отправить
   номер телефона»).
3. Клиент делится контактом → webhook получает `message_created` с `attachments[].type=contact` и
   полями `vcf_info` + `hash`.
4. Сервер **проверяет** `hash`: `HMAC-SHA256(MAX_BOT_TOKEN, vcf_info)` === `hash` (перед
   хешированием `\r\n` в `vcf_info` заменить на реальные переносы строк).
5. По номеру из `vcf_info` сервер ищет **клиента** на этой станции → берёт все его авто → создаёт
   подписки `(vehicle_id → chat_id/user_id, channel=max)` для каждого.
6. Бот отвечает: «Уведомления подключены для: Toyota Camry, А123ВС777 (+N авто)».
7. Если клиент с таким номером не найден — бот отвечает: «Номер не найден в базе СТО. Обратитесь в
   сервис.»

Управление подписками:

- Команда/текст **«стоп»** или кнопка «Отключить уведомления» → удаляет подписки пользователя
  (`channel=max`) → «Уведомления отключены».
- Событие `bot_stopped` → подписки помечаются `is_active=false` (или удаляются).

## 3. Миграция

```php
Schema::create('notification_subscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('vehicle_id')->constrained()->cascadeOnDelete();
    $table->string('chat_id');                       // из Update.chat_id
    $table->string('user_id')->nullable();           // из Update.user.user_id
    $table->string('channel')->default('max');       // max | telegram
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->unique(['vehicle_id', 'channel', 'chat_id']);
});
```

## 4. Webhook

1. `POST https://platform-api2.max.ru/subscriptions` — подписка на обновления: `update_types`:
   `bot_started`, `bot_stopped`, `message_created`, `message_callback`.
2. URL webhook: `https://domain/api/max/webhook` (HTTPS, доверенный сертификат).
3. Обработчик `POST /api/max/webhook` (без auth, проверка по `secret` из подписки):
   - `bot_started` → приветствие + кнопка `request_contact`
   - `message_created` (contact) → связка подписок (см. §2)
   - `bot_stopped` → деактивация подписок
   - `message_callback` с payload `unsubscribe` → отписка
4. В проде — только webhook (Long Polling `GET /updates` не подходит для production).

## 5. Триггеры отправки

Отправка **после** успешной смены статуса ремонта (события `RepairStatusChanged`). Для каждого
события берутся подписки всех авто клиента? Нет — **только авто, которого касается событие**
(`vehicle_id` ремонта), `is_active=true`:

| Событие                     | Текст клиенту (формирует сервер, markdown)                               |
| --------------------------- | ------------------------------------------------------------------------ |
| `status → new`              | «Заказ №123 принят. Авто: А123ВС77. Статус: {public_url}»                |
| `status → pending_approval` | «Смета готова. Работы и суммы: {public_url}» (сумма может отсутствовать) |
| `estimate approved`         | «Смета подтверждена, приступаем к работе.»                               |
| `estimate declined`         | «Смета отклонена. Обсудим детали по телефону.»                           |
| `status → in_progress`      | «Автомобиль в работе.»                                                   |
| `status → waiting_parts`    | «Ждём запчасти.»                                                         |
| `status → done`             | «Ремонт готов! Авто можно забирать: {public_url}»                        |
| `status → completed`        | «Авто выдано. Подтвердите получение: {public_url}»                       |
| `client_confirm → disputed` | «Вы указали ошибку. Мы её исправим и вернёмся.»                          |

### Состав сообщения (важно)

Каждое сообщение (markdown) содержит:

1. **Название автосервиса** — `service_stations.name` станции, к которой привязан ремонт (заголовок:
   «СТО Партнёр»), не просто «Автовидно».
2. **Номер заказа** — `repair_orders.order_number` (например «Р-1052») + статусная строка.
3. **Список выполненных работ** — в финальных сообщениях (`done`, `completed`, а также при
   `processed`) — `work_items` (title, is_done) заказ-наряда:

```
🚗 СТО «Партнёр» — ремонт готов

Заказ №Р-1052 (VIN ...ABCDE)
Выполненные работы:
- Замена масла
- Замена фильтров

Статус: https://.../vehicles/...  ← public_url
```

Так:

| Событие                     | Что добавляется к статусной строке                               |
| --------------------------- | ---------------------------------------------------------------- |
| `status → new`              | название СТО + номер заказа                                      |
| `status → done`             | название СТО + номер заказа + список `work_items` (is_done=true) |
| `status → completed`        | название СТО + номер заказа + список `work_items` (is_done=true) |
| `client_confirm → disputed` | название СТО + номер заказа                                      |

- Список работ берётся из `repair_work_items` на момент события (после `done`/`completed` не
  чистятся, см. ТЗ «История авто»).
- Название СТО/номер заказа — строки, не объекты (без лишних ПДн).
- Если работ нет — пункт «Выполненные работы» пропускается.

Правила:

- Повторная отправка при том же статусе не выполняется (события только при реальной смене).
- Ошибка доставки (бот заблокирован и т.п.) логируется, подписка помечается неактивной.
- Формат сообщения: `format: markdown` (поддерживаются ссылки).

## 6. Эндпоинты для фронта

| Метод    | Путь                                           | Назначение                                             |
| -------- | ---------------------------------------------- | ------------------------------------------------------ |
| `GET`    | `/repairs/{id}/notifications`                  | статус каналов (список каналов: chat_id, is_active)    |
| `GET`    | `/repairs/{id}/notifications/link?channel=max` | ссылка на диалог с ботом (`https://max.ru/<username>`) |
| `DELETE` | `/repairs/{id}/notifications?channel=max`      | отписка клиента (по chat_id владельца подписки авто)   |

Ответы — стандарт: `{ data: ... }`, ошибки 401/403/404/422.

## 7. Фронтенд (этот репозиторий)

- Кнопка **«Уведомлять в MAX»** на публичной странице `/public/vehicles/:token` —
  `window.open(link)` (готова, использует `https://max.ru/id650202270142_bot`).
- Кнопка в панели публичной ссылки карточки ремонта `/repairs/:id` (готова).
- После подключения клиента — `refetch` «статуса канала», показ «Уведомления подключены» (когда
  заработают эндпоинты §6).

## 8. Настройка

1. Бот уже создан: «Автовидно» (`id650202270142_bot`), токен в `.env` → `MAX_BOT_TOKEN=`.
2. Webhook: после деплоя вызвать `POST /subscriptions` (или artisan-команду `max:webhook:set`).
3. Один бот на окружение (dev/stage/prod).

## Приоритет

1. Webhook + подписки + триггеры статусов (этот документ).
2. `GET /repairs/{id}/notifications*` для фронта.
3. Telegram-канал после решения проблемы доступности API (тот же `NotificationService`).
4. Напоминания о ТО (крон раз в день: пробег/время с последнего визита).

в конце скинь список выполненных работ в md
