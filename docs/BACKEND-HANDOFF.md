# Backend update — Автовидно / DVSH (один файл для Laravel)

Фронт уже готов под эти контракты. Реализуй на API и БД по порядку приоритета ниже.

Базовый URL: `/api/v1`

---

## Приоритет

1. **Подтверждение клиентом после «Выдан»** (новая фича) — §1
2. **История авто: полный `work_items[]` + `mileage`** — §2
3. **Пробег: серверная валидация минимума** — §3
4. **`chassis_number` (VIN или шасси)** — §4
5. Hotfix (если ещё не закрыты) — §5

---

# §1. Подтверждение клиентом после «Выдан»

## Продукт

```
done → «Выдан» (completed)
     → client_confirm_status = pending
     → СТО НЕ редактирует

Клиент по публичной ссылке:
  • «Подтвердить»     → confirmed  → навсегда только чтение
  • «Есть ошибка»+коммент → disputed → СТО правит → снова pending
```

## Миграция `repair_orders`

| Колонка                  | Тип               | Описание                               |
| ------------------------ | ----------------- | -------------------------------------- |
| `client_confirm_status`  | string nullable   | `pending` \| `confirmed` \| `disputed` |
| `client_confirm_comment` | text nullable     | комментарий при disputed               |
| `client_confirmed_at`    | datetime nullable | когда confirmed                        |

## При `status → completed`

Автоматически:

```text
client_confirm_status = pending
client_confirm_comment = null
client_confirmed_at = null
```

- обновить floor пробега (§3).

## Блокировка staff

| `client_confirm_status` | Staff PATCH / CRUD works/parts / client / vehicle по заказу |
| ----------------------- | ----------------------------------------------------------- |
| `pending`               | **запрещено** → `403` или `422`                             |
| `confirmed`             | **запрещено навсегда**                                      |
| `disputed`              | **разрешено**                                               |
| `null` (не completed)   | обычные правила                                             |

Исключение при `disputed`: можно править поля и:

```http
PATCH /api/v1/repairs/{id}
Content-Type: application/json

{ "client_confirm_status": "pending" }
```

Сервер при повторной отправке:

```text
client_confirm_status = pending
client_confirm_comment = null
client_confirmed_at = null
```

## Новый public endpoint

```http
POST /api/v1/public/vehicles/{token}/confirm
```

### Confirm

```json
{ "decision": "confirmed", "comment": null }
```

### Dispute

```json
{ "decision": "disputed", "comment": "Неверный VIN, должно быть ..." }
```

Правила:

- есть `current_repair` с `status = completed`
- `client_confirm_status = pending`
- `disputed` → `comment` обязателен (не пустой)
- ответ = тот же shape, что `GET /public/vehicles/{token}`

При `confirmed`:

- `client_confirm_status = confirmed`
- `client_confirmed_at = now()`

При `disputed`:

- `client_confirm_status = disputed`
- `client_confirm_comment = comment`

## `current_repair` vs `previous_repairs` (важно)

Пока `client_confirm_status` ∈ `{ pending, disputed }`:

- заказ **остаётся в `current_repair`**, даже при `status = completed`
- иначе клиент не сможет подтвердить

После `confirmed`:

- заказ уходит в `previous_repairs`
- `current_repair` = другой активный или `null`

## Поля в ответах

### Staff `GET /api/v1/repairs/{id}`

Добавить:

```json
{
  "client_confirm_status": "pending",
  "client_confirm_comment": null,
  "client_confirmed_at": null
}
```

### Public `GET /api/v1/public/vehicles/{token}` → `current_repair`

```json
{
  "order_number": "Р-1052",
  "status": "completed",
  "status_label": "Выдан",
  "client_name": "Иван Петров",
  "mileage": 87200,
  "client_confirm_status": "pending",
  "client_confirm_comment": null,
  "client_confirmed_at": null,
  "work_items": [
    { "title": "Замена масла", "is_done": true },
    { "title": "Замена фильтров", "is_done": true }
  ],
  "updated_at": "2026-08-12T18:00:00Z"
}
```

`client_name` обязателен для проверки клиентом.  
VIN / шасси — на уровне vehicle (`vin`, `chassis_number`).

Можно дублировать `client_name` на корне `PublicVehicle`.

## Acceptance §1

- [ ] `completed` → `client_confirm_status = pending`
- [ ] pending / confirmed → staff не меняет заказ
- [ ] disputed → staff правит + `PATCH client_confirm_status=pending`
- [ ] `POST .../confirm` confirmed / disputed работает
- [ ] pending / disputed остаются в `current_repair`
- [ ] confirmed → история, дальше immutable
- [ ] в payload есть `client_name`, `mileage`, `work_items`, `client_confirm_*`

---

# §2. История авто: полный список работ + пробег

Фронт показывает «История по этому авто» на create (шаг 3) и на `/repairs/{id}`.

Сейчас часто одна строка / без пробега — потому что API не отдаёт поля.

## Нужно в ответах

### `GET /api/v1/vehicles/{id}` → `repairs[]`

```json
{
  "id": "12",
  "order_number": "Р-1051",
  "status": "completed",
  "updated_at": "2026-08-12T14:56:24Z",
  "total": 0,
  "mileage": 87200,
  "work_items": [
    { "title": "Диагностика", "is_done": true },
    { "title": "Замена масла", "is_done": true },
    { "title": "Замена фильтров", "is_done": true }
  ]
}
```

### `GET /api/v1/vehicles/search` → `previous_repairs[]`

Тот же контракт: полный `work_items[]` + `mileage` этого заказ-наряда.

`title` — опциональный fallback, источник правды — `work_items`.

### Public `previous_repairs[]`

Тоже: `work_items` + `mileage` (snapshot, не терять после выдачи).

## Правила

1. `mileage` в истории = `repair_orders.mileage`, не «текущий» пробег авто.
2. После `completed` / `confirmed` `work_items` не чистить.
3. Search и show vehicle согласованы.

## Acceptance §2

- [ ] Каждый прошлый ремонт отдаёт полный `work_items[]`
- [ ] У каждого есть `mileage` (если был на заказе)
- [ ] После закрытия работы и пробег не пропадают

---

# §3. Пробег — обязательная проверка на сервере

Фронт — только UX. Источник истины — Laravel.

## Правило

1. У заказ-наряда есть `mileage` — пробег на момент работ.
2. При `status → completed`:
   - зафиксировать `repair.mileage`
   - обновить `vehicles.last_completed_mileage = max(floor, repair.mileage)`
   - при необходимости обновить `vehicles.mileage`
3. Любой следующий create/update с `mileage`:
   - если floor известен → **`mileage >= last_completed_mileage`**
   - иначе → **`422`**

Floor только по `completed` (не `done`).

Точки проверки:

- `POST /repairs`
- `PATCH /repairs/{id}`
- intake / `PATCH /vehicles/{id}` (если пишут mileage)

### 422

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "mileage": ["Пробег не может быть меньше 87200 км (последний выданный заказ)"]
  }
}
```

## Отдавать в API

- vehicle: `mileage`, `last_completed_mileage`
- repair: `mileage`
- history / public: `mileage` по визитам (§2)

## Acceptance §3

- [ ] mileage &lt; floor → всегда `422`
- [ ] floor обновляется только из `completed`
- [ ] staff/public отдают mileage + floor

---

# §4. Номер шасси `chassis_number`

Когда нет VIN — обязателен номер шасси.

## БД `vehicles`

| field            | type            |
| ---------------- | --------------- |
| `chassis_number` | string nullable |

- `vin` — nullable
- unique на непустых `vin` / `chassis_number` (в рамках станции, если так принято)

## Валидация

Везде, где пишется авто (intake, POST/PATCH vehicles):

- есть VIN → шасси необязателен
- нет VIN → `chassis_number` обязателен
- нельзя сохранить без VIN и без шасси

Поиск: по `vin`, `chassis_number`, `license_plate`.

Отдавать `chassis_number` в staff vehicle/repair и в public vehicle.

## Acceptance §4

- [ ] авто без VIN создаётся с шасси
- [ ] без VIN и без шасси → `422`
- [ ] поле есть в search / show / public

---

# §5. Hotfixes (если ещё не закрыты)

### 5.1 Duplicate `public_token` на 2-м ремонте

Токен живёт на **`vehicles.public_token`**.  
При `POST /repairs` **не копировать** тот же token в `repair_orders` (UNIQUE ломает 2-й ремонт).

Staff/public URL строить от vehicle token.

### 5.2 Public show → JSON, не redirect

`GET /public/vehicles/{token}` (и legacy repairs) → JSON `{ data: ... }`, не `redirect()`.

### 5.3 Whitelist статусов

Принимать:

`new`, `pending_approval`, `in_progress`, `waiting_parts`, `done`, `completed`

---

# Чеклист «можно отдавать фронту»

- [ ] §1 confirm endpoint + поля + lock + current_repair пока pending/disputed
- [ ] §2 history `work_items` + `mileage`
- [ ] §3 server mileage floor
- [ ] §4 `chassis_number`
- [ ] §5 hotfixes (если были)

---

## Коротко для исполнителя

1. После «Выдан» ставь `client_confirm_status=pending`, блокируй staff; клиент —
   `POST /public/vehicles/{token}/confirm`; pending/disputed держи в `current_repair`; после
   confirmed — навсегда read-only.
2. В историю авто отдавай полный `work_items[]` и `mileage` каждого заказа.
3. Пробег ниже floor после completed — только `422` на сервере.
4. VIN или `chassis_number` — одно из двух обязательно.
