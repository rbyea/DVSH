# Бэкенд: текущий пакет изменений

Последующие задачи для Laravel складываем **в этот файл**, новые `docs/backend-*.md` не создаём.
Старые хендоффы остаются как есть.

Базовый URL: `/api/v1`. Ответы: `{ "data": ... }`.

---

## 1. Профиль СТО: контакты станции

Фронт на `/station` (вкладка «Станция») редактирует не только `name`, но и контакты, которые потом
нужны клиенту в публичной карточке, в сообщениях MAX и в печати заказ-наряда.

Сейчас `GET/PATCH /api/v1/station` отдают/принимают `name` и `master_share_percent`. Новые поля
фронт уже шлёт в `PATCH`; если бэкенд их отбрасывает, название всё равно сохраняется, а контакты
временно живут только в браузере. Нужно хранить их в `service_stations`.

## Поля `service_stations`

| Поле            | Тип          | Обязательное | Notes                                                             |
| --------------- | ------------ | ------------ | ----------------------------------------------------------------- |
| `name`          | string       | да           | уже есть                                                          |
| `phone`         | string, null | нет          | телефон СТО, РФ, 11 цифр, нормализовать к `7XXXXXXXXXX` или `+7…` |
| `city`          | string, null | нет          | до 80 символов                                                    |
| `address`       | string, null | нет          | до 180 символов                                                   |
| `working_hours` | string, null | нет          | свободный текст, до 80 символов, напр. `пн–сб 9:00–20:00`         |

Пустая строка в PATCH → сохранить `null`.

## `GET /api/v1/station`

```json
{
  "data": {
    "id": 1,
    "name": "СТО на Ленина",
    "master_share_percent": 50,
    "phone": "+7 964 906-15-67",
    "city": "Краснодар",
    "address": "ул. Красная, 12",
    "working_hours": "пн–сб 9:00–20:00"
  }
}
```

## `PATCH /api/v1/station`

Body (все поля optional, как сейчас):

```json
{
  "name": "СТО на Ленина",
  "master_share_percent": 50,
  "phone": "+7 964 906-15-67",
  "city": "Краснодар",
  "address": "ул. Красная, 12",
  "working_hours": "пн–сб 9:00–20:00"
}
```

Ответ — тот же объект, что у GET.

422: невалидный `phone` (не РФ / не 11 цифр); слишком длинные строки. Формат
`{ "message": "...", "errors": { "phone": ["..."] } }`.

## Публичка (сразу, иначе клиент контакты не увидит)

`GET /public/vehicles/{token}` — добавить объект станции:

```json
{
  "station": {
    "name": "СТО на Ленина",
    "phone": "+7 964 906-15-67",
    "city": "Краснодар",
    "address": "ул. Красная, 12",
    "working_hours": "пн–сб 9:00–20:00"
  }
}
```

`name` обязателен. Остальное может быть `null`. Пока поля нет — фронт блок контактов не показывает.

Печать заказ-наряда и MAX-уведомления: в шапке/футере достаточно `station.name` + `station.phone`
(если phone не null).

## Не делать в этой задаче

- логотип / загрузка файлов
- слотный календарь слотов (график — одна строка)
- реквизиты ИНН/ОГРН станции
- смена email/пароля владельца

---

## 2. Оплата: экран тарифов переехал

Фронт больше не держит выбор тарифа на `/billing`. Тарифы (1 / 3 / 12 мес) живут во вкладке
**Подписка**: `/station#subscription`.

- `/billing` на фронте редиректит на `/station#subscription`
- если подписка истекла, SPA пускает только на `/station` (чтобы можно было оплатить); ремонты
  по-прежнему закрыты
- цены без изменений: 1 200 / 3 300 / 12 000 ₽

Когда появится эквайринг: `POST /billing/payments` как в `docs/backend-alfa-acquiring.md`.
**ReturnUrl** после оплаты лучше вести на `/station#subscription` (или `/station#subscription`

- `orderId`), не на отдельную `/billing`. Страницу `/billing/success` можно не делать.

---

## 3. MAX: маршруты есть, уведомления не уходят (22.08.2026)

Полное ТЗ: `docs/backend-max-notifications.md`. Ниже — что реально на проде (`autovidno.tw1.ru`) и
что починить. Фронт статусы уже меняет через `PATCH /repairs/{id}/status`; галочки
`work_items.is_done` **не** должны слать уведы (работы только в тексте `done`/`completed`).

### Что уже выкачено

- `POST /api/max/webhook` → `{"ok":true}` (пустой POST тоже ok — похоже на заглушку)
- `GET /api/v1/repairs/{id}/notifications` → `{ "data": [] }` (200, авторизация есть)
- `GET /api/v1/repairs/{id}/notifications/link?channel=max` → ссылка на бота
- `DELETE /api/v1/repairs/{id}/notifications?channel=max` — маршрут есть

Проверка на Р-1008 (`id=35`, клиент «Тест», телефон `+7 995 006-08-27`): `notifications` пустой.
Смена статуса и отметки работ в MAX ничего не присылают.

Бот «Автовидно» (`id650202270142_bot`) живой: исходящее сообщение через MAX API доходит. Токен
только в `.env` (`MAX_BOT_TOKEN`), не в git и не в ответах API.

### Что сломано / не сделано

1. **Webhook не был подписан в MAX.** `GET https://platform-api2.max.ru/subscriptions` был `[]`.
   Маршрут Laravel сам по себе события не получает. Нужна команда вроде `max:webhook:set`:
   `POST https://platform-api2.max.ru/subscriptions` с
   `url=https://autovidno.tw1.ru/api/max/webhook` и `update_types`: `bot_started`, `bot_stopped`,
   `message_created`, `message_callback`. (22.08 фронт временно прописал подписку сам, чтобы
   проверить канал — бэк должен владеть этим и переживать деплой.)
2. **Нет команды `/start` у бота.** `GET /me` не отдавал `commands` — клиент видит «бот не настроен
   на старт». Прописать через `PATCH /me/commands`:
   `{ "name": "start", "description": "Подключить уведомления о ремонте" }` (тоже в artisan при
   деплое, не руками).
3. **`bot_started` не отвечает.** После Start нет приветствия и кнопки `request_contact`. Сейчас
   webhook, скорее всего, только ack `ok`.
4. **Контакт не создаёт подписку.** После «Отправить номер» в `notification_subscriptions` пусто →
   `GET .../notifications` всегда `[]`. Нужно: проверить `hash` (HMAC-SHA256 токена по `vcf_info`),
   найти клиента по телефону (нормализовать к тем же 11 цифрам, что в `clients.phone`), повесить
   `channel=max` на **все его** `vehicle_id`, ответить списком авто. Если номер не найден — «Номер
   не найден в базе СТО».
5. **Смена статуса не шлёт MAX.** После успешного `PATCH /repairs/{id}/status` (и approve/decline
   сметы, `client_confirm disputed`) взять активные подписки **этого** `vehicle_id` и отправить
   сообщение. Без подписки — молча, без 500. Галочки работ не триггер.
6. **Текст сообщения** как в ТЗ §5: название СТО + номер заказа; в `done`/`completed` — список
   `work_items` с `is_done=true` + public_url.

### Как проверить, что починили

1. `GET /me` → есть команда `start`.
2. `GET /subscriptions` у MAX → url на `/api/max/webhook`, в типах есть `bot_started`.
3. Клиент жмёт Start → бот просит телефон.
4. Шлёт контакт с номером из карточки клиента → `GET /repairs/{id}/notifications` не пустой
   (`channel=max`, `is_active=true`, есть `chat_id`).
5. Смена статуса `in_progress` → `done` → в MAX приходит сообщение со списком работ.

---

## 4. Диагностика сканера (CSV) на карточке авто (22.08.2026)

Фронт уже парсит CSV сканера (Launch / аналоги) на карточке ремонта: VIN, марка/модель, коды ошибок
по модулям. Пока это `localStorage` — видит только этот браузер, этот заказ-наряд. Нужно хранить на
сервере и отдавать **на карточке автомобиля** (staff + публичка клиента).

Файл — не таблица клиентов, а отчёт приёмки. Коды **не** превращать в `work_items` автоматически.

### Сверка VIN

Перед сохранением нормализовать VIN (верхний регистр, без пробелов, 17 символов) и сравнить с
`vehicles.vin` авто, к которому крепим скан.

- совпал → 201
- в файле/теле нет VIN → 422 `scan_vin_empty`
- у авто нет VIN → 422 `vehicle_vin_empty`
- не совпал → 422 `vin_mismatch` + оба значения в `errors`

### Модель `vehicle_diagnostics`

| Поле          | Тип              | Notes                                              |
| ------------- | ---------------- | -------------------------------------------------- |
| `id`          | id               |                                                    |
| `vehicle_id`  | FK vehicles      | cascade delete                                     |
| `repair_id`   | FK repairs, null | визит, с которого загрузили; null = просто на авто |
| `vin`         | string           | VIN из скана (уже совпавший)                       |
| `make`        | string, null     |                                                    |
| `model`       | string, null     |                                                    |
| `year`        | string, null     |                                                    |
| `serial`      | string, null     | серийник сканера / шасси из файла                  |
| `repair_type` | string, null     | `PRE_REPAIR` / `POST_REPAIR`                       |
| `scanned_at`  | datetime, null   | время из отчёта                                    |
| `shop_name`   | string, null     |                                                    |
| `file_name`   | string, null     | оригинальное имя CSV                               |
| `faults`      | json             | массив объектов ниже                               |
| `created_at`  | timestamp        |                                                    |

`faults[]`:

```json
{
  "system": "ECM -Модуль Контроля Двигателя",
  "code": "P0299",
  "description": "Пониженное давление наддува двигателя",
  "status": null,
  "has_fault": true
}
```

Модуль без ошибок: `"code": null, "has_fault": false`. Парсит фронт, бэк **принимает готовый JSON**
(сырой CSV на первом этапе не обязателен).

На авто может быть несколько сканов (история визитов). На карточке по умолчанию — **последний**.

### Эндпоинты (auth, станция авто)

`POST /api/v1/vehicles/{id}/diagnostics`

```json
{
  "repair_id": 35,
  "vin": "W0LPF2DC0DG038451",
  "make": "OPEL",
  "model": "Astra-J",
  "year": "2013",
  "serial": "9TDP80202418",
  "repair_type": "PRE_REPAIR",
  "scanned_at": "2026-08-13T11:47:02",
  "shop_name": "АВТОСЕРВИС",
  "file_name": "20260813164827762301.csv",
  "faults": []
}
```

`repair_id` optional; если передан — ремонт должен быть этого же `vehicle_id`.

`GET /api/v1/vehicles/{id}/diagnostics` — список, новые сверху.  
`DELETE /api/v1/vehicles/{id}/diagnostics/{diagnosticId}` — снять скан.

Ответ элемента:

```json
{
  "data": {
    "id": "1",
    "vehicle_id": "18",
    "repair_id": "35",
    "vin": "W0LPF2DC0DG038451",
    "make": "OPEL",
    "model": "Astra-J",
    "year": "2013",
    "scanned_at": "2026-08-13T11:47:02+00:00",
    "faults": [],
    "created_at": "2026-08-22T16:20:00+00:00"
  }
}
```

### Куда вставлять в существующие GET

Чтобы фронт не плодил запросы, достаточно **последнего** скана:

- `GET /vehicles/{id}` → `latest_diagnostic` (объект или `null`)
- `GET /repairs/{id}` → `vehicle.latest_diagnostic` или `diagnostic` (тот же объект)
- `GET /public/vehicles/{token}` → `latest_diagnostic` (без внутренних id станции, клиенту коды
  можно)

На публичке и в панели авто клиента — свёрнутый блок «Диагностика» (как на карточке ремонта).

### Не делать в этой задаче

- разбор сырого CSV на Laravel (фронт уже парсит)
- автосоздание работ из DTC
- хранение файла на диске (достаточно JSON)
- стримы DataStream / графики живых датчиков

---

## 5. Согласование: `pending_approval` без `estimate_status`

Публичка показывает «На согласовании» по `status`, а `POST /public/vehicles/{token}/estimate` сейчас
принимает решение только при `estimate_status=pending`. Если СТО выставило статус селектом
(`PATCH /repairs/{id}/status` → `pending_approval`), поле сметы остаётся `null`: клиент видит статус
и не может нажать «Согласовать» (или кнопка есть, а API отвечает 422).

Нужно:

- `PATCH /repairs/{id}/status` с `{ "status": "pending_approval" }` → ставить
  `estimate_status=pending` (как кнопка «На согласование»)
- `POST /public/vehicles/{token}/estimate` принимать `approved`/`declined`, если
  `status=pending_approval` **или** `estimate_status=pending`
- в `GET /public/vehicles/{token}` при `status=pending_approval` и пустом `estimate_status` отдавать
  `estimate_status: "pending"`
- Пока статус «На согласовании», клиент должен мочь нажать «Согласовать». `POST .../estimate` не
  отклонять, если `status=pending_approval`.
- **Проверено на проде 22.08, Р-1008:** клиент уже согласовал (`estimate_status=approved`,
  `estimate_decided_at` есть), но `status` остался `pending_approval`. По ТЗ после решения должно
  быть `status=in_progress`. Из‑за этого карточка пишет «На согласовании», повторный POST не
  проходит, СТО не может поставить «Готово».
- После `declined` **нельзя** оставлять/возвращать `pending_approval`: это статус ожидания клиента,
  а СТО должно править список. Нужен отдельный статус.

---

## 6. Статус `revision` — «Изменение работ»

Клиент отклонил список работ и написал, что поменять. СТО должно править заказ, а не ждать
повторного согласования. Сейчас после отказа `status` остаётся `pending_approval` (или фронт ставит
`in_progress`, бэк возвращает согласование). При обновлении страницы заказ снова «На согласовании»,
комментарий клиента теряется.

### Whitelist статусов

Добавить `revision` рядом с `pending_approval` / `in_progress`.

| Значение           | UI              | Смысл                              |
| ------------------ | --------------- | ---------------------------------- |
| `pending_approval` | На согласовании | Ждём ответ клиента                 |
| `revision`         | Изменение работ | Клиент отклонил, СТО правит список |
| `in_progress`      | В работе        | Клиент согласовал, работы идут     |

Поток: `pending_approval` → клиент `approved` → `in_progress`;  
`pending_approval` → клиент `declined` → `revision` → СТО жмёт «Отправить снова» →
`pending_approval`.

### Что сделать

- `POST /public/vehicles/{token}/estimate` с `decision=declined`: `status=revision`,
  `estimate_status=declined`, `estimate_comment=comment`
- `decision=approved`: `status=in_progress` (как в ТЗ)
- `PATCH /repairs/{id}` и `PATCH /repairs/{id}/status` принимают `revision`
- `PATCH` со `status=revision` **не** сбрасывать `estimate_status` в `pending` и **не** затирать
  `estimate_comment`
- `GET /repairs/{id}` и публичный GET отдают `status: "revision"` и `estimate_comment`
- «Отправить снова» с фронта: `{ status: "pending_approval", estimate_status: "pending" }`
