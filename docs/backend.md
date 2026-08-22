# DVSH — Backend (Laravel) · единое ТЗ

Один документ для бэкенда. Фронт: React SPA (Автовидно / DVSH).

База API: `/api/v1`  
Auth: JWT `Authorization: Bearer {token}`  
Ответы: `{ "data": ... }` · ошибки 401 / 403 / 404 / 422 / 500

---

## 0. Приоритет

1. `public_token` на **vehicle** (не unique на repair) — иначе 2-й ремонт на авто падает 1062
2. Публичка отдаёт **JSON**, не `redirect()`
3. Статусы: whitelist с `pending_approval` и `completed` (без `diagnostics`)
4. Пробег: серверный floor после «Выдан»
5. Подтверждение клиентом после «Выдан»
6. История авто: полный `work_items[]` + `mileage`
7. `chassis_number` (если нет VIN)
8. Несколько авто у клиента
9. Мастера + `price` / `hours` / `is_extra` + `master_share_percent`
10. SPA fallback `index.html` (deep links)
11. **Регистрация + 30 дней trial + блокировка /billing**

---

## 1. Статусы и enums

### `repair_orders.status`

| Значение           | UI              |
| ------------------ | --------------- |
| `new`              | Новый           |
| `pending_approval` | На согласовании |
| `in_progress`      | В работе        |
| `waiting_parts`    | Ждём запчасти   |
| `done`             | Готово          |
| `completed`        | Выдан           |

**Убрать:** `diagnostics`.

Поток: `new` → (`pending_approval`) → `in_progress` → (`waiting_parts`) → `done` → `completed`.

### `estimate_status`

`null` | `pending` | `approved` | `declined`

- СТО жмёт «На согласование» → `estimate_status=pending` + `status=pending_approval`
- Клиент решает по **списку работ** (без обязательной суммы): `pending` ставится даже если
  `total=null`
- Клиент решил → `approved|declined` + `status=in_progress`
- Пока `pending`: нельзя `is_done`, нельзя `done`/`completed` (403/422)
- Просто сохранить `total` **не** ставит `pending`
- При создании ремонта (или в первый раз после него) — автоматическая отправка на согласование.
  Дубликаты не нужны: повторный `pending` при уже `pending`/`approved` игнорировать (идемпотентно)

### `client_confirm_status` (после «Выдан»)

`null` | `pending` | `confirmed` | `disputed`

При `status → completed`:

- `client_confirm_status = pending`
- `client_confirm_comment = null`
- `client_confirmed_at = null`
- (+ обновить mileage floor)

| Статус      | Редактирование staff              |
| ----------- | --------------------------------- |
| `pending`   | запрещено                         |
| `confirmed` | навсегда запрещено                |
| `disputed`  | разрешено + можно снова `pending` |
| `null`      | как обычно                        |

Пока `pending|disputed` — ремонт остаётся в **`current_repair`** на публичке, даже при
`completed`.  
После `confirmed` — в `previous_repairs`.

---

## 2. Auth

| Method | Path             | Notes                                                |
| ------ | ---------------- | ---------------------------------------------------- |
| POST   | `/auth/register` | регистрация СТО + 30 дней trial                      |
| POST   | `/auth/login`    | → `access_token`, `user`                             |
| POST   | `/auth/refresh`  |                                                      |
| POST   | `/auth/logout`   | 204                                                  |
| GET    | `/auth/me`       | работает и для expired (чтобы фронт кинул на оплату) |

User: `id`, `name`, `email`, `service_station_id`, `role?`, **`subscription_status`**,
**`trial_ends_at`**, **`subscription_ends_at`**.

### Регистрация

`POST /auth/register`

```json
{
  "name": "Иван Иванов",
  "email": "sto@example.com",
  "password": "secret123",
  "password_confirmation": "secret123",
  "station_name": "СТО на Ленина"
}
```

Создать `service_station` + user `role=owner`.  
Триал: `subscription_status=trial`, `trial_ends_at = now + 30 days`.  
Ответ как у login: `{ access_token, token_type, expires_in, user }`.

Email unique. 422 при занятом email.

### Подписка

`subscription_status`: `trial` | `active` | `expired` | `blocked`

- После регистрации — `trial` на 30 дней
- По истечении `trial_ends_at` без оплаты → `expired`
- Staff API (кроме `/auth/*`) для expired: **403**
  `{ "message": "Subscription expired", "code": "subscription_expired" }`
- `/auth/me`, `/auth/logout`, `/auth/refresh` **не** блокировать
- После оплаты: `active` + `subscription_ends_at`
- Старые демо-аккаунты без полей — считать `active`

## 3. Станция и мастера

Мастера — **справочник** (ФИО + профессия), **не** учётки для входа.

### Модель `masters`

| Поле                 | Тип                |
| -------------------- | ------------------ |
| `id`                 | PK                 |
| `service_station_id` | FK                 |
| `full_name`          | string             |
| `specialty`          | string             |
| `is_active`          | bool, default true |
| timestamps           |                    |

### `service_stations`

| Поле                   | Тип       | Notes                                        |
| ---------------------- | --------- | -------------------------------------------- |
| `name`                 | string    |                                              |
| `master_share_percent` | int 0–100 | **default 50** — доля мастера от цены работы |

### Эндпоинты

```http
GET    /api/v1/station
PATCH  /api/v1/station
# body: { "name": "...", "master_share_percent": 50 }

GET    /api/v1/station/masters
POST   /api/v1/station/masters
# { "full_name": "...", "specialty": "Механик" }  — без email/password

PATCH  /api/v1/station/masters/{id}
# { "full_name"?, "specialty"?, "is_active"? }

DELETE /api/v1/station/masters/{id}
```

`is_active=false` — скрыть из селекта новых назначений; в старых работах оставить snapshot `master`.

---

## 4. Клиенты и несколько авто

### `GET /clients/{id}`

```json
{
  "data": {
    "id": "1",
    "name": "Иван",
    "phone": "+79001234567",
    "email": null,
    "vehicles": [
      {
        "id": "10",
        "car_model": "Toyota Camry",
        "license_plate": "А123ВС777",
        "vin": null,
        "chassis_number": "CHS123456",
        "mileage": 120000
      }
    ]
  }
}
```

### `POST /clients/{id}/vehicles` — добавить авто существующему клиенту (предпочтительно)

```json
{
  "car_model": "Kia Rio",
  "license_plate": "В456ОР777",
  "vin": "JTNB11HK703456789",
  "chassis_number": null,
  "mileage": 50000
}
```

Клиент берётся из URL. **Не** создавать нового клиента.

### `POST /vehicles` — тот же эффект, если вложенного роута нет

```json
{
  "client_id": 1,
  "client_name": "Иван",
  "car_model": "Kia Rio",
  "license_plate": "В456ОР777",
  "vin": "JTNB11HK703456789",
  "chassis_number": null,
  "mileage": 50000
}
```

Правила:

- `client_id` (или id в URL) — **required**, `exists:clients,id` этой станции
- VIN **или** chassis (`required_without`, оба ключа можно слать: одно значение, другое `null`)
- уникальность VIN/chassis в рамках станции (среди non-null)
- **Сохранить новую строку** в `vehicles` с этим `client_id` (`$client->vehicles()->create(...)`,
  hasMany)
- Если пришёл `client_id` — **не** создавать клиента по `client_name` и **не** `update` единственное
  авто клиента
- Ответ `201`:
  `{ "data": { "id", "client_id", "car_model", "license_plate", "vin", "chassis_number", "mileage" } }`

Остальное:

- `GET/POST /clients`, `PUT /clients/{id}`
- `GET /clients?search=&page=&per_page=`

### Intake (новый клиент + авто)

`POST /intake/clients-with-vehicle` (или эквивалент):

`client_name`, `client_phone`, `client_email?`, `car_model`, `license_plate`, `vin?`,
`chassis_number?`, `mileage?`  
→ `{ client, vehicle }`

---

## 5. Автомобили

### Поля `vehicles`

| Поле                         | Notes                                              |
| ---------------------------- | -------------------------------------------------- |
| `car_model`, `license_plate` | required                                           |
| `vin`                        | nullable, 17 символов; unique среди non-null       |
| `chassis_number`             | nullable, 5–25 (A-Z,0-9,-); `required_without:vin` |
| `mileage`                    | nullable int ≥ 0                                   |
| `last_completed_mileage`     | floor после «Выдан»                                |
| `public_token`               | **SoT**, unique                                    |
| `public_url`                 | `/public/vehicles/{token}`                         |

Пустая строка VIN/chassis → `null`.

### Поиск

`GET /vehicles/search?q=` — по номеру, VIN, **chassis** (≥ 2 символов).

В ответе: клиент, авто, `mileage`, `last_completed_mileage`, `previous_repairs[]` с полным
`work_items[]` + `mileage`.

### `GET /vehicles/{id}`

Авто + `client` + `repairs[]`:

```json
{
  "id": "...",
  "order_number": "…",
  "status": "completed",
  "updated_at": "...",
  "total": 18500,
  "mileage": 120500,
  "work_items": [
    { "title": "Замена масла", "is_done": true, "price": 3500, "hours": 1.5, "is_extra": false }
  ]
}
```

После `completed` / `confirmed` **не чистить** `work_items`.

---

## 6. Пробег (серверный floor)

1. При `status → completed`: сохранить `repair.mileage`;  
   `vehicles.last_completed_mileage = max(floor, repair.mileage)` (если mileage не null).
2. Floor считать **только** из `completed` (не `done`).
3. На `POST/PATCH /repairs` и при смене mileage на vehicle:  
   если floor известен и mileage задан → `mileage >= last_completed_mileage`, иначе **422**:

```json
{
  "errors": {
    "mileage": ["Пробег не может быть меньше 120500 км (последний выданный заказ)"]
  }
}
```

Отдавать фронту: `vehicle.last_completed_mileage` в карточке ремонта / поиске; `mileage` в публичке
и истории.

---

## 7. Ремонты (заказ-наряды)

### Список

`GET /repairs?search=&status=&page=&per_page=`

`search` ищет по: номеру заказа, машине, **ФИО клиента**, **ФИО мастера** на работах.

### Создание

`POST /repairs`

```json
{
  "vehicle_id": 10,
  "client_id": 1,
  "status": "new",
  "planned_ready_at": "2026-08-20",
  "mileage": 120500,
  "total": 18500,
  "comment": "Заметка мастера",
  "work_items": [
    {
      "title": "Диагностика",
      "master_id": 10,
      "price": 2000,
      "hours": 1,
      "is_extra": false
    },
    {
      "title": "Полировка",
      "master_id": null,
      "price": 5000,
      "hours": 2,
      "is_extra": true
    }
  ],
  "ordered_parts": [{ "name": "Фильтр", "quantity": 1, "price": 850 }]
}
```

- `order_number` генерирует сервер
- `public_token` **не** писать в `repair_orders` (берётся с vehicle)
- `total` — nullable int ≥ 0, **persist** (fillable)

### Карточка / обновление

- `GET /repairs/{id}`
- `PATCH /repairs/{id}` — status, planned_ready_at, comment, mileage, total, estimate_status,
  client_confirm_status
- `PATCH /repairs/{id}/status` — `{ "status": "..." }`

В ответе staff всегда:

```json
{
  "public_token": "<vehicle.public_token>",
  "public_url": "/public/vehicles/<token>",
  "vehicle": { "id": "...", "public_token": "...", "last_completed_mileage": 120000 }
}
```

### Work items

`POST|PATCH|DELETE /repairs/{id}/work-items[/{workItem}]`

Поля:

| Поле        | Тип                                   |
| ----------- | ------------------------------------- |
| `title`     | string                                |
| `is_done`   | bool                                  |
| `price`     | nullable number, ₽                    |
| `hours`     | nullable decimal                      |
| `is_extra`  | bool, default false (доп. работы)     |
| `master_id` | nullable FK                           |
| `master`    | `{ id, full_name, specialty }` на GET |

Route binding: work item должен принадлежать repair + станции (иначе 404, не 500).

### Parts

`POST|PATCH|DELETE /repairs/{id}/parts[/{part}]`

| Поле       | Тип                                  |
| ---------- | ------------------------------------ |
| `name`     | string                               |
| `quantity` | int ≥ 1                              |
| `price`    | nullable number — цена за единицу, ₽ |

---

## 8. Публичная карточка (клиент без логина)

### Эндпоинты

| Method | Path                                | Notes                          |
| ------ | ----------------------------------- | ------------------------------ |
| GET    | `/public/vehicles/{token}`          | **канон**                      |
| GET    | `/public/repairs/{token}`           | legacy alias → **тот же JSON** |
| POST   | `/public/vehicles/{token}/estimate` | согласование сметы             |
| POST   | `/public/vehicles/{token}/confirm`  | подтверждение после выдачи     |

`POST /repairs/{id}/public-link` — **deprecate** (токен на vehicle, не регенерировать на каждый
ремонт).

### Ответ `GET /public/vehicles/{token}`

```json
{
  "data": {
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС777",
    "vin": null,
    "chassis_number": "CHS123",
    "client_name": "Иван",
    "client_vehicles": [
      {
        "public_token": "aaa",
        "car_model": "Toyota Camry",
        "license_plate": "А123ВС777",
        "vin": null,
        "chassis_number": "CHS123"
      },
      {
        "public_token": "bbb",
        "car_model": "Kia Rio",
        "license_plate": "В456ОР777",
        "vin": "...",
        "chassis_number": null
      }
    ],
    "current_repair": {
      "order_number": "…",
      "status": "in_progress",
      "status_label": "В работе",
      "planned_ready_at": "2026-08-20",
      "total": 18500,
      "total_formatted": "18 500 ₽",
      "mileage": 120500,
      "comment": "Заметка мастера",
      "estimate_status": null,
      "estimate_comment": null,
      "estimate_decided_at": null,
      "client_confirm_status": null,
      "client_confirm_comment": null,
      "client_confirmed_at": null,
      "client_name": "Иван",
      "work_items": [{ "title": "Замена масла", "is_done": true, "price": 3500, "hours": 1.5 }],
      "updated_at": "…"
    },
    "previous_repairs": [
      {
        "order_number": "…",
        "status": "completed",
        "completed_at": "…",
        "total": 10000,
        "mileage": 118000,
        "work_items": [{ "title": "Диагностика", "is_done": true }],
        "client_confirm_status": "confirmed"
      }
    ]
  }
}
```

Правила:

- Один `public_token` на авто навсегда
- `current_repair` = активный / или `completed` пока confirm `pending|disputed`
- `previous_repairs` = закрытые после confirm (и старые completed)
- `comment` = `repair_orders.comment`
- Минимум PII (телефон СТО не обязателен)

### Estimate

```http
POST /public/vehicles/{token}/estimate
{ "decision": "approved" | "declined", "comment": "..." }
```

`comment` обязателен при `declined`. Только если `estimate_status=pending`. Решение принимается по
списку работ; `total` при этом может быть `null`.

### Confirm (после выдачи)

```http
POST /public/vehicles/{token}/confirm
{ "decision": "confirmed", "comment": null }
{ "decision": "disputed", "comment": "Неверный VIN" }
```

Только если `status=completed` и `client_confirm_status=pending`.  
Ответ = тот же JSON, что GET.

Staff снова отправить на подтверждение:

```http
PATCH /repairs/{id}
{ "client_confirm_status": "pending" }
```

---

## 9. Hotfixes (обязательно)

### 9.1 Duplicate `public_token`

**Симптом:** `1062 Duplicate entry … repair_orders_public_token_unique` на 2-м ремонте.

**Фикс:** SoT = `vehicles.public_token`. При `POST /repairs` не писать token в repair. Убрать UNIQUE
с `repair_orders.public_token`. Старые ссылки: resolve repair-token → vehicle.

### 9.2 Public 500 / redirect

`PublicRepairController::show` не должен делать `redirect()`. Всегда JSON 200 (Accept:
application/json).

### 9.3 Binding work-items / parts

`{workItem}` / `{part}` — модели в скоупе repair + station → 404, не 500.

### 9.4 `total`

Fillable + validation `nullable|integer|min:0`. Отдавать `total` и желательно `total_formatted`.

---

## 10. Go-live (опционально)

Очистка демо-данных, оставить/создать:

| Email           | Password   |
| --------------- | ---------- |
| `master@sto.ru` | `password` |
| `sto@sto.ru`    | `password` |

Предпочтительно **две** станции (demo / партнёр).  
Удалить: work_items, parts, repairs, vehicles, clients.  
Пароли сменить перед продом.

---

## 11. SPA на том же домене

Deep links (`/login`, `/dashboard`, `/repairs/:id`, `/public/vehicles/:token`) должны отдавать
`index.html`, не 404.

- nginx: `try_files $uri /index.html;`
- или Laravel `web.php` catch-all → `public/index.html`
- API `/api/v1/*` не трогать
- `/assets/*` — статикой

Скопировать Vite `dist/*` в Laravel `public/` (не затереть `index.php`).

---

## 12. Acceptance (короткий чеклист)

### Hotfixes

- [ ] 2-й ремонт на то же авто → 201, без 1062
- [ ] один `public_token` на vehicle
- [ ] GET public → 200 JSON
- [ ] `pending_approval` и `completed` в whitelist

### Публичка / смета / выдача

- [ ] estimate только при `pending`; после решения → `in_progress`
- [ ] пока смета pending — нельзя закрывать работы / выдавать
- [ ] `completed` → `client_confirm_status=pending`, staff lock
- [ ] disputed → edit + resend pending
- [ ] confirmed → история, immutable
- [ ] `current_repair.comment` с мастера

### Авто / клиент

- [ ] VIN или chassis
- [ ] поиск по chassis
- [ ] floor mileage после completed, 422 ниже floor
- [ ] история: полный `work_items[]` + `mileage`
- [ ] `GET /clients/{id}` → `vehicles[]`
- [ ] `POST /vehicles` с `client_id`
- [ ] public `client_vehicles[]` с токенами

### Мастера / деньги

- [ ] CRUD `/station/masters` без email/password
- [ ] `GET/PATCH /station` + `master_share_percent` (default 50)
- [ ] work_items: `master_id`, nested `master`, `price`, `hours`, `is_extra`
- [ ] parts: `price`
- [ ] search ремонтов по ФИО клиента и мастера

### Деплой

- [ ] SPA deep links 200
- [ ] API жив

---

## 13. Модели (сводка полей)

| Таблица             | Ключевые поля                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `users`             | name, email, password, service_station_id                                                       |
| `service_stations`  | name, **master_share_percent**                                                                  |
| `masters`           | station_id, full_name, specialty, is_active                                                     |
| `clients`           | station_id, name, phone, email                                                                  |
| `vehicles`          | client_id, plate, model, vin?, chassis?, mileage?, **last_completed_mileage**, **public_token** |
| `repair_orders`     | vehicle_id, status, planned_ready_at, comment, mileage, total, estimate__, client_confirm__     |
| `repair_work_items` | title, is_done, **master_id**, **price**, **hours**, **is_extra**                               |
| `repair_parts`      | name, quantity, **price**                                                                       |

---

_Документ для бэкенда DVSH. При расхождении со старым `rest-api.md` — этот файл главный._
