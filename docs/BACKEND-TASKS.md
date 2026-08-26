# Backend: пул задач (сводно, 19.08.2026)

Единый список задач для Laravel-бэкенда. Детали каждого пункта — в указанном файле ТЗ.

**Новые задачи с 22.08.2026** пишем в `docs/backend-station-profile.md`, отдельные файлы ТЗ больше
не заводим.

Базовый URL: `/api/v1`. Формат ответов: `{ "data": ... }`.

Статусы: **[Д] — сделано/выкачено**, **[Н] — не сделано, делаем**.

---

## Блок 1. Новые требования (вне предыдущих хендоффов)

### 1.1 [Д] MAX-бот: `/start` молчит на проде (23.08, утро)

**Файл ТЗ:** `docs/backend-max-start-handoff.md`

- Было: `/start` и номер текстом — тишина
- Сейчас: `/start` и кнопка контакта отвечают; ломается проверка номера — см. **1.1b**

### 1.1b [Н] MAX-бот: «Не удалось подтвердить номер телефона» (23.08, вечер)

**Файл ТЗ:** `docs/backend-max-contact-hash-handoff.md`

- Кнопка `request_contact` на проде отвечает этой фразой — падает HMAC `vcf_info` / `hash`
- Это не «номера нет в базе» и не фронт
- После успешного hash — подписка `channel=max` и уведы со статуса

### 1.1a [Д] MAX-бот: уведомления о статусе ремонта (код, не прод)

**Файл ТЗ:** `docs/backend-max-notifications.md`  
**Что по факту сломано на проде (22.08):** `docs/backend-station-profile.md` §3

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

### 1.6 [Н] Альфа-эквайринг: `POST /billing/payments` (прод)

**Файл ТЗ:** `docs/backend-alfa-acquiring.md`

- Фронт уже шлёт `{ plan }` и ждёт `{ payment_id, payment_url }`
- Боевой шлюз: `https://payment.alfabank.ru/payment/rest/register.do`, логин `-api` только в `.env`
- ReturnUrl: `https://autovidno.tw1.ru/station` (без hash), fail: `?payment=fail`
- `GET /billing/payments?alfa_order_id=` + webhook; сумма в копейках из справочника тарифов

### 1.2 [Н] Public: `client_vehicles` + `ordered_parts` в истории

**Файл ТЗ:** `docs/backend-handoff-public-vehicles.md`

- `GET /public/vehicles/{token}` → `client_vehicles`: все авто клиента с `public_token` (сейчас поле
  не приходит, блок «Ваши автомобили» скрыт)
- `previous_repairs[]` → `ordered_parts` (name, quantity, price) — фронт уже выводит запчасти с
  ценами и включает их в сумму
- Проверка: открыть публичную страницу — блок авто и запчасти в «Истории по авто»

### 1.3 [Д] Профиль СТО: телефон, город, адрес, график

**Файл ТЗ:** `docs/backend-station-profile.md`

- `service_stations`: `phone`, `city`, `address`, `working_hours` (все nullable)
- `GET/PATCH /station` принимают и отдают эти поля вместе с `name` / `master_share_percent`
- `GET /public/vehicles/{token}` → объект `station` `{ name, phone, city, address, working_hours }`
- Фронт уже шлёт поля в `PATCH /station` (вкладка «Станция»)

### 1.4 [Д] Диагностика сканера на карточке авто

**Файл ТЗ:** `docs/backend-station-profile.md` §4

- Таблица `vehicle_diagnostics` (привязка к `vehicle_id`, опционально `repair_id`)
- Сверка VIN с авто, иначе 422
- `POST/GET/DELETE /vehicles/{id}/diagnostics`; в `GET /vehicles/{id}`, `GET /repairs/{id}` и
  `GET /public/vehicles/{token}` — `latest_diagnostic`
- Фронт парсит CSV сам, на бэк шлёт JSON; коды не делать работами автоматически

### 1.5 [Д] Согласование при `pending_approval` без `estimate_status`

**Файл ТЗ:** `docs/backend-station-profile.md` §5

- Селект статуса `pending_approval` должен ставить `estimate_status=pending`
- Публичный `POST .../estimate` принимать решение и по статусу, и по `estimate_status`
- После `approved`/`declined` статус должен стать `in_progress` (на проде Р-1008 остался
  `pending_approval` при уже `estimate_status=approved`)
- В публичном GET не отдавать `estimate_status: null` при статусе «На согласовании»

### 1.6 [Д] Статус `revision` после отказа клиента

**Файл ТЗ:** `docs/backend-station-profile.md` §6

- Whitelist: `revision` («Изменение работ»)
- `declined` → `status=revision`, сохранить `estimate_comment`
- Не возвращать `pending_approval` при обновлении / status-only PATCH
- «Отправить снова» → снова `pending_approval` + `estimate_status=pending`

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

1. **1.1b** MAX-бот: подтверждение номера / HMAC (ключевой контур; фронт готов)
2. **1.6** Альфа-эквайринг UAT (`POST /billing/payments`)
3. **1.2** `client_vehicles` + `ordered_parts` (мелкие добавки в ответы, чинит видимые блоки)
4. **1.3** контакты СТО
5. **Блок 3** — сделать всё, чего ещё нет (фронт готов)
6. **1.4** диагностика сканера — не блокер выдачи
7. **4.1** — по готовности к выдаче в СТО
