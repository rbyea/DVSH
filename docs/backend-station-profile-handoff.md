# Отчёт по бэкенду и задачи для фронта

Пакет по ТЗ: `public/backend-station-profile.md`  
Дата: 23.08.2026  
Базовый URL API: `/api/v1`, ответы `{ "data": ... }`

---

## Кратко

| §   | Тема                                     | Бэкенд                  | Фронт                                      |
| --- | ---------------------------------------- | ----------------------- | ------------------------------------------ |
| 1   | Контакты СТО                             | ✅                      | Подключить сохранение и показ              |
| 2   | Тарифы на `/station#subscription`        | — (только фронт)        | ✅ сделать у себя                          |
| 3   | MAX-уведомления                          | ✅ код + деплой-команды | Проверить сценарий, убрать ручную подписку |
| 4   | Диагностика CSV                          | ✅                      | Убрать `localStorage`, слать на API        |
| 5   | `pending_approval` без `estimate_status` | ✅                      | Учесть в публичке и селектах               |
| 6   | Статус `revision`                        | ✅                      | Новый статус в UI                          |

---

## Деплой на проде (операции, не фронт)

После выката кода на сервере:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:clear && php artisan config:cache
```

В `.env` обязательно:

```env
MAX_BOT_TOKEN=...
MAX_BOT_USERNAME=id650202270142_bot
MAX_WEBHOOK_URL=https://autovidno.tw1.ru/api/max/webhook
MAX_WEBHOOK_SECRET=...   # случайная строка
```

Регистрация бота в MAX (после миграций и `.env`):

```bash
php artisan max:webhook:set
php artisan max:commands:set
```

Проверка:

- `GET https://platform-api2.max.ru/subscriptions` — url на `/api/max/webhook`
- `GET https://platform-api2.max.ru/me` — есть команда `start`
- `POST https://autovidno.tw1.ru/api/max/webhook` → `200`, `{"ok":true}`

Ошибка `Webhook URL is required` → нет `MAX_WEBHOOK_URL` в `.env` или не сброшен `config:cache`.  
Обход: `php artisan max:webhook:set --url=https://autovidno.tw1.ru/api/max/webhook`

---

## §1. Контакты СТО

### Что сделано на бэкенде

- Миграция: поля `phone`, `city`, `address`, `working_hours` в `service_stations`
- `GET/PATCH /api/v1/station` — новые поля в ответе и приёме
- Телефон: валидация РФ (11 цифр), хранение `7XXXXXXXXXX`, в API формат `+7 964 906-15-67`
- Пустая строка в PATCH → `null`
- `GET /api/v1/public/vehicles/{token}` → объект `station` (`name`, `phone`, `city`, `address`,
  `working_hours`)
- PDF заказ-наряда: в шапке название СТО + телефон (если есть)
- MAX-сообщения: в шапке название СТО + телефон (если есть)

### Что сделать фронту

1. **Вкладка «Станция» (`/station`)**
   - При загрузке читать `GET /station` и заполнять поля `phone`, `city`, `address`, `working_hours`
   - При сохранении слать их в `PATCH /station` (уже шлёте — теперь бэк сохраняет)
   - Показывать 422 по полю `phone`, если номер невалидный

2. **Публичная карточка клиента**
   - Блок контактов СТО из `data.station`
   - Показывать только если есть хотя бы одно непустое поле кроме `name` (или если
     `phone`/`city`/`address`/`working_hours` не `null`)
   - `name` всегда есть; остальное может быть `null`

3. **Печать / PDF**
   - Менять ничего не нужно — PDF генерит бэкенд (`GET /public/repairs/{token}/pdf`)

---

## §2. Оплата: тарифы на `/station#subscription`

### Бэкенд

Изменений нет. Эквайринг (`POST /billing/payments`) — отдельная задача по
`docs/backend-alfa-acquiring.md`.

### Что сделать фронту

1. Перенести выбор тарифа (1 / 3 / 12 мес, 1 200 / 3 300 / 12 000 ₽) на `/station#subscription`
2. `/billing` → редирект на `/station#subscription`
3. При истёкшей подписке пускать SPA только на `/station` (оплата), ремонты закрыты
4. Когда появится эквайринг: `ReturnUrl` после оплаты — `/station#subscription` (не
   `/billing/success`)

---

## §3. MAX-уведомления

### Что сделано на бэкенде

- Webhook `POST /api/max/webhook` — обработка `bot_started`, `message_created`, `message_callback`,
  `bot_stopped`
- После Start — приветствие и кнопка «Отправить номер»
- Контакт: проверка HMAC, поиск клиента по телефону, подписка на все его авто
- Уведомления при смене статуса ремонта, согласовании/отклонении сметы, `client_confirm disputed`
- Галочки `work_items.is_done` **не** триггерят уведомления (только текст в `done`/`completed`)
- Artisan: `max:webhook:set`, `max:commands:set` (команда `/start` у бота)

Эндпоинты для панели СТО (без изменений):

- `GET /api/v1/repairs/{id}/notifications`
- `GET /api/v1/repairs/{id}/notifications/link?channel=max`
- `DELETE /api/v1/repairs/{id}/notifications?channel=max`

### Что сделать фронту

1. **Убрать ручную регистрацию webhook в MAX** (если делали с фронта 22.08) — теперь только
   `php artisan max:webhook:set` на деплое
2. **Карточка ремонта** — блок «Уведомления MAX»: показывать подписки из `GET .../notifications`;
   ссылку на бота — из `.../notifications/link`
3. **Не слать PATCH при галочках работ** — только при смене статуса заказа
   (`PATCH /repairs/{id}/status`)
4. **Проверить сценарий на стенде/проде:**
   - Start в боте → запрос телефона
   - Контакт с номером из карточки клиента → в API появляется подписка `channel=max`,
     `is_active=true`
   - Смена статуса `in_progress` → `done` → сообщение в MAX со списком выполненных работ

---

## §4. Диагностика сканера (CSV)

### Что сделано на бэкенде

Таблица `vehicle_diagnostics`, эндпоинты:

| Метод    | Путь                                               |
| -------- | -------------------------------------------------- |
| `POST`   | `/api/v1/vehicles/{id}/diagnostics`                |
| `GET`    | `/api/v1/vehicles/{id}/diagnostics`                |
| `DELETE` | `/api/v1/vehicles/{id}/diagnostics/{diagnosticId}` |

Вложенные поля (без лишних запросов):

| GET                               | Поле                        |
| --------------------------------- | --------------------------- |
| `/api/v1/vehicles/{id}`           | `latest_diagnostic`         |
| `/api/v1/repairs/{id}`            | `vehicle.latest_diagnostic` |
| `/api/v1/public/vehicles/{token}` | `latest_diagnostic`         |

Сверка VIN перед сохранением (422):

| Код в `errors.vin`  | Условие                                                 |
| ------------------- | ------------------------------------------------------- |
| `scan_vin_empty`    | нет VIN в теле / не 17 символов                         |
| `vehicle_vin_empty` | у авто в БД нет VIN                                     |
| `vin_mismatch`      | VIN не совпал (+ в `errors`: `scan_vin`, `vehicle_vin`) |

Тело `POST` — готовый JSON после парсинга CSV на фронте (см. ТЗ §4).

### Что сделать фронту

1. **Карточка ремонта** — после парсинга CSV вызывать  
   `POST /api/v1/vehicles/{vehicleId}/diagnostics`  
   с `repair_id`, `vin`, `make`, `model`, `year`, `faults`, …  
   Убрать сохранение в `localStorage`
2. **Обработка 422** — показать понятные тексты по `scan_vin_empty` / `vehicle_vin_empty` /
   `vin_mismatch`
3. **Карточка автомобиля (staff)** — блок «Диагностика» из `latest_diagnostic`
   (`GET /vehicles/{id}`)
4. **Карточка ремонта (staff)** — из `vehicle.latest_diagnostic` (`GET /repairs/{id}`)
5. **Публичка клиента** — свёрнутый блок «Диагностика» из `latest_diagnostic`
6. **Удаление скана** (если есть в UI) — `DELETE .../diagnostics/{id}`
7. **История** — при необходимости `GET .../diagnostics` (новые сверху); на карточке по умолчанию
   достаточно `latest_diagnostic`

---

## §5–6. Согласование сметы и статус `revision`

### Что сделано на бэкенде

**Согласование (`§5`):**

- `PATCH /repairs/{id}/status` с `pending_approval` → автоматически `estimate_status=pending`
- `POST /public/vehicles/{token}/estimate` принимает решение, если `status=pending_approval` **или**
  `estimate_status=pending`
- В публичном GET при `pending_approval` и пустом `estimate_status` в БД отдаётся
  `estimate_status: "pending"`
- После `approved` → `status=in_progress`

**Новый статус `revision` (`§6`):**

| Значение           | UI (предложение) | Смысл                       |
| ------------------ | ---------------- | --------------------------- |
| `pending_approval` | На согласовании  | Ждём клиента                |
| `revision`         | Изменение работ  | Клиент отклонил, СТО правит |
| `in_progress`      | В работе         | Клиент согласовал           |

Поток:

```
pending_approval → approved  → in_progress
pending_approval → declined  → revision → (СТО правит) → «Отправить снова» → pending_approval
```

- `declined` → `status=revision`, `estimate_status=declined`, `estimate_comment` сохраняется
- `PATCH` со `status=revision` не сбрасывает `estimate_comment` и не ставит
  `estimate_status=pending`

### Что сделать фронту

1. **Селект статусов заказа** — добавить `revision` / «Изменение работ»
2. **Публичка** — при `status=revision` не показывать кнопки «Согласовать/Отклонить»; показывать
   `estimate_comment` клиента (для информации СТО на staff-карточке)
3. **После отклонения клиентом** — ожидать `status: "revision"`, не `in_progress` и не
   `pending_approval`
4. **Кнопка «Отправить снова»** — `PATCH /repairs/{id}`:
   ```json
   {
     "status": "pending_approval",
     "estimate_status": "pending"
   }
   ```
5. **Селект «На согласовании»** — можно слать только `{ "status": "pending_approval" }`; бэк сам
   выставит `estimate_status=pending`
6. **Публичка: кнопка «Согласовать»** — показывать при `status=pending_approval` или
   `estimate_status=pending` (в т.ч. когда в ответе `estimate_status: "pending"` при пустом поле в
   БД)
7. **Завершение ремонта** — нельзя `done`/`completed`, пока смета в ожидании
   (`estimate_status=pending`); при `revision` ограничений по смете нет (клиент уже отклонил)

---

## Чеклист приёмки (фронт + прод)

- [ ] Контакты СТО сохраняются и видны на публичке
- [ ] CSV-диагностика уходит на сервер и видна на карточке авто
- [ ] Клиент может согласовать смету после смены статуса селектом на «На согласовании»
- [ ] После отклонения — статус `revision`, комментарий не пропадает
- [ ] «Отправить снова» возвращает в `pending_approval`
- [ ] MAX: Start → телефон → подписка → уведомление при смене статуса
- [ ] `/billing` редиректит на `/station#subscription`

---

## Файлы бэкенда (для ориентира)

| Область                 | Ключевые файлы                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Контакты СТО            | `StationResource`, `PublicStationResource`, `UpdateStationRequest`, миграция `add_contact_fields_to_service_stations` |
| Диагностика             | `VehicleDiagnostic*`, `VehicleDiagnosticService`, миграция `create_vehicle_diagnostics`                               |
| Согласование / revision | `RepairOrderService`, `RepairStatus`, `PublicRepairResource`                                                          |
| MAX                     | `MaxWebhookService`, `SetMaxWebhookCommand`, `SetMaxBotCommandsCommand`, `config/max.php`                             |

Тесты: `StationTest`, `VehicleDiagnosticTest`, `EstimateApprovalTest`, `PublicRepairTest`,
`MaxNotificationTest`.
