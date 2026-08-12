# Backend (Laravel) — ТЗ и фиксы для фронта DVSH

Единый документ для бэкенда. Справочник эндпоинтов: [`rest-api.md`](./rest-api.md).

---

## Приоритет сейчас (блокеры)

1. **Duplicate `public_token`** при `POST /repairs` → нельзя создать 2-й ремонт на авто
2. **`PublicRepairController::show` + `redirect()`** → публичная карточка 500
3. **`pending_approval` не в whitelist** → 422 «The selected status is invalid»
4. **Пробег: серверная проверка минимума после «Выдан»** → см.
   [`backend-mileage.md`](./backend-mileage.md)
5. **Подтверждение клиентом после «Выдан»** → см.
   [`backend-client-confirm.md`](./backend-client-confirm.md)
6. Остальные фиксы ниже (binding, `total`, история, estimate)

---

# Часть A. Hotfix (чиним сейчас)

## A1. Duplicate `public_token` при создании ремонта

### Симптом

```
SQLSTATE[23000]: Integrity constraint violation: 1062
Duplicate entry '…' for key 'repair_orders.repair_orders_public_token_unique'
```

Падает на `INSERT INTO repair_orders` при **втором и далее** ремонте того же авто.

### Причина

Токен должен жить на **vehicle**, но create repair копирует тот же token в
`repair_orders.public_token`, где остался **UNIQUE**.

Это **не** «сначала закрой текущий ремонт». Закрытие заказа проблему не снимает.

### Что сделать

1. Source of truth — `vehicles.public_token`
   - нет токена → сгенерировать один раз (первый ремонт / создание авто)
   - при `POST /repairs` **не писать** тот же token в `repair_orders` (`null` / не трогать колонку)

2. Схема БД (предпочтительно):
   - убрать `UNIQUE` с `repair_orders.public_token`
   - колонка на repair — nullable / deprecate
   - `UNIQUE` оставить на `vehicles.public_token`

3. В ответе staff (`GET/POST/PATCH repairs`) отдавать токен с vehicle:

```json
{
  "public_token": "<vehicle.public_token>",
  "public_url": "/public/vehicles/<token>",
  "vehicle": {
    "id": "...",
    "public_token": "...",
    "public_url": "..."
  }
}
```

Можно дублировать поля на корне repair для фронта, но **не хранить** тот же unique token во второй
строке `repair_orders`.

### Проверка

1. Ремонт на авто A → ок
2. Второй ремонт на то же авто A → **201**, без 500
3. У обоих один и тот же `public_token` / `public_url`
4. В БД: один token на vehicle, без unique-конфликта в `repair_orders`

---

## A2. Публичная ссылка → 500 (RedirectResponse)

### Симптом

```
PublicRepairController::show(): Return value must be of type
App\Http\Resources\PublicRepairResource|Illuminate\Http\JsonResponse,
Illuminate\Http\RedirectResponse returned
```

Фронт:

```http
GET /api/v1/public/repairs/{publicToken}
Accept: application/json
```

### Причина

В `show()` сделали `return redirect(...)` на vehicles, но return type —
`PublicRepairResource|JsonResponse`.  
`RedirectResponse` не входит → TypeError / 500.

Для SPA нужен **JSON**, не HTTP 302.

### Что сделать

Убрать любой `return redirect(...)` из typed `show()`.

Alias → сразу JSON:

```php
public function show(string $publicToken): PublicRepairResource|JsonResponse
{
    $vehicle = Vehicle::query()
        ->where('public_token', $publicToken)
        ->first();

    // legacy: старый repair-token → vehicle
    if (!$vehicle) {
        $repair = RepairOrder::query()
            ->where('public_token', $publicToken)
            ->first();
        $vehicle = $repair?->vehicle;
    }

    if (!$vehicle) {
        return response()->json(['message' => 'Not found'], 404);
    }

    return new PublicVehicleResource($vehicle);
    // НЕ: return redirect(...)
}
```

- Основной: `GET /api/v1/public/vehicles/{token}` → JSON (контракт в части B)
- Legacy: `GET /api/v1/public/repairs/{token}` → **тот же JSON** (alias), пока фронт не переключён

**Не делать:** менять только return type на `RedirectResponse` «чтобы ошибка пропала».

### Проверка

```http
GET /api/v1/public/repairs/{validToken}
Accept: application/json
```

```http
GET /api/v1/public/vehicles/{validToken}
Accept: application/json
```

Ожидание: **200 + JSON**, не 302, не 500. Публичная страница на фронте открывается.

---

## A3. Статус `pending_approval` — «The selected status is invalid»

### Симптом

```http
PATCH /api/v1/repairs/{id}/status

{ "status": "pending_approval" }
```

→ **422** `The selected status is invalid.`

Также с кнопки «На согласование»:

```http
PATCH /api/v1/repairs/{id}

{
  "estimate_status": "pending",
  "status": "pending_approval",
  "total": 15000
}
```

### Причина

В `Rule::in` / enum БД нет `pending_approval` (и часто нет `completed`). Старый список с
`diagnostics`.

### Что сделать

Whitelist везде (create / update / updateStatus):

| status             | label           |
| ------------------ | --------------- |
| `new`              | Новый           |
| `pending_approval` | На согласовании |
| `in_progress`      | В работе        |
| `waiting_parts`    | Ждём запчасти   |
| `done`             | Готово          |
| `completed`        | Выдан           |

**Убрать:** `diagnostics`.

```php
'status' => [
    'required',
    'string',
    Rule::in([
        'new',
        'pending_approval',
        'in_progress',
        'waiting_parts',
        'done',
        'completed',
    ]),
],
```

Если MySQL `ENUM` — обновить колонку тем же списком.

Флоу сметы:

- СТО «На согласование» → `estimate_status = pending` + `status = pending_approval`
- Клиент approve/decline → `estimate_status = approved|declined` + `status = in_progress`

### Проверка

`PATCH .../status` с `pending_approval` → **200**.  
`PATCH /repairs/{id}` с обоими полями → **200**.  
`completed` тоже принимается.

---

## A4. Checklist hotfixes

- [ ] Второй+ ремонт на то же авто без `1062`
- [ ] Один `public_token` на vehicle для всех ремонтов авто
- [ ] `GET /public/repairs/{token}` → 200 JSON (без RedirectResponse)
- [ ] `GET /public/vehicles/{token}` → 200 JSON
- [ ] `pending_approval` и `completed` в whitelist / enum
- [ ] Старые публичные ссылки живы (map / alias)
- [ ] Публичное estimate работает для `current_repair`

Фронт сейчас: toast на duplicate token; публичка ещё бьёт `/public/repairs/...` — legacy должен
отдавать JSON. Переключение на `/public/vehicles/...` — после стабильного vehicles API.

---

# Часть B. Публичная ссылка на автомобиль (продуктовое ТЗ)

## Цель

Одна постоянная публичная ссылка на **автомобиль**, не на каждый заказ-наряд.

Клиенту один раз отдали ссылку — новые ремонты и история открываются по ней же.

## B1. Токен на vehicle

- `public_token` + `public_url` на **vehicle**
- при создании ремонта токен **не генерируется заново**
- нет токена → создать один раз
- все ремонты авто отдают **один и тот же** token/url

`POST /repairs/{id}/public-link` — убрать или deprecated (перевыпуск в MVP не нужен).

## B2. Публичный endpoint

**Стало:** `GET /public/vehicles/{publicToken}`  
**Legacy:** `GET /public/repairs/{token}` — **alias с JSON**, не HTTP redirect (см. A2).

### Ответ

```json
{
  "data": {
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС 777",
    "vin": "...",
    "current_repair": {
      "order_number": "РО-1042",
      "status": "in_progress",
      "status_label": "В работе",
      "planned_ready_at": "2026-08-20",
      "total": 18500,
      "total_formatted": "18 500 ₽",
      "estimate_status": null,
      "estimate_comment": null,
      "estimate_decided_at": null,
      "work_items": [{ "title": "Замена масла", "is_done": true }],
      "updated_at": "2026-08-12T12:00:00Z"
    },
    "previous_repairs": [
      {
        "order_number": "РО-1001",
        "status": "completed",
        "status_label": "Выдан",
        "completed_at": "2026-07-01T15:00:00Z",
        "updated_at": "2026-07-01T15:00:00Z",
        "total": 12000,
        "total_formatted": "12 000 ₽",
        "work_items": [{ "title": "Диагностика", "is_done": true }]
      }
    ]
  }
}
```

### Правила

**`current_repair`:** активный ремонт (не `completed`), самый свежий; если нет — `null`.

**`previous_repairs`:** закрытые/выданные (`completed`; политику по старым `done` — на усмотрение),
без текущего, новые сверху, желательно с `work_items`.

## B3. Согласование сметы (публичное)

`POST /public/vehicles/{token}/estimate`  
(или legacy `/public/repairs/{token}/estimate` с resolve → `current_repair`)

```json
{ "decision": "approved", "comment": null }
```

```json
{ "decision": "declined", "comment": "пока без замены колодок" }
```

Правила:

- `estimate_status = pending` **только** после явного «На согласование» на СТО
- при отправке статус ремонта → **`pending_approval`**
- простое сохранение `total` **не** ставит `pending` и **не** меняет статус
- если `estimate_status` null — на публичке нет кнопок согласования, только сумма

Пока `pending` / `pending_approval`:

- нельзя `is_done` у работ → `403` / `422`
- нельзя статус `done` / `completed`
- названия работ править можно

После решения клиента:

| Решение     | `estimate_status` | Статус ремонта  |
| ----------- | ----------------- | --------------- |
| Согласовано | `approved`        | → `in_progress` |
| Отклонено   | `declined`        | → `in_progress` |

После `approved` / `declined` — отметить работы снова можно.

## B4. Справочник статусов

| status             | label           |
| ------------------ | --------------- |
| `new`              | Новый           |
| `pending_approval` | На согласовании |
| `in_progress`      | В работе        |
| `waiting_parts`    | Ждём запчасти   |
| `done`             | Готово          |
| `completed`        | Выдан           |

Убрать: `diagnostics`.

Флоу: `new` → (`pending_approval`) → `in_progress` → `waiting_parts?` → `done` → `completed`

## B5. Статус `completed` («Выдан»)

1. **`done`** — авто готово, ещё можно править
2. **«Автомобиль выдан»** → **`completed`** + `client_confirm_status = pending`

После `completed` — см. полное ТЗ [`backend-client-confirm.md`](./backend-client-confirm.md):

- staff **не правит**, пока `pending` / `confirmed`
- клиент подтверждает или пишет ошибку (`POST .../confirm`)
- при `disputed` staff снова может править и отправить на подтверждение
- пока `pending|disputed` заказ остаётся в **`current_repair`**
- после `confirmed` — навсегда только чтение, заказ в `previous_repairs`

## B6. Миграция данных

1. Для каждого `vehicle` без токена — сгенерировать `public_token`
2. Старые repair-токены → канонический vehicle-токен или map `old → vehicle`
3. Уже выданные ссылки не должны умирать

## B7. Не делать сейчас

- regenerate public link
- отдельная ссылка на каждый ремонт
- SMS / шаринг

## B8. Acceptance (vehicle-link)

- [ ] Один `public_url` на все ремонты авто
- [ ] Новый ремонт не меняет ссылку
- [ ] Публичка: `current_repair` + `previous_repairs`
- [ ] Смета на согласование только при `estimate_status = pending`
- [ ] Отправка сметы → `pending_approval`
- [ ] Нет `diagnostics`
- [ ] После approve/decline → `in_progress`
- [ ] Пока pending — нельзя `is_done` / `done` / `completed`
- [ ] `completed` закрывает заказ на API
- [ ] `previous_repairs[].work_items` сохраняются
- [ ] Старые ссылки открываются

Фронт готов подстраиваться под `/public/vehicles/{token}`, vehicle token в staff, `completed`,
`current_repair` / `previous_repairs`.

---

# Часть C. Прочие фиксы Laravel

## C1. Route binding work-items / parts (500)

`PATCH/DELETE .../work-items/{workItem}` и `.../parts/{part}` падают:

`Attempt to read property "id" on string` в `AppServiceProvider` (custom `Route::bind`).

Нужно: `{workItem}` / `{part}` → модель, скоуп к `{repair}` и `service_station_id`.

Проверка: toggle `is_done`, rename, quantity, delete → `200` / `204`.

## C2. Сохранение `total`

Фронт шлёт `total` в `POST/PATCH /repairs`. Часто в БД остаётся `0`.

- `$fillable` + валидация `nullable|integer|min:0`
- сохранять и отдавать (+ желательно `total_formatted`)

## C3. История авто в search / show

Фронт: `previous_repairs` из search или `repairs` из `GET /vehicles/{id}`  
(блок на 3-м шаге создания и на `/repairs/{id}`).

Хотя бы один источник стабильно заполнен.

**Важно:** в каждом элементе истории нужны:

- полный **`work_items[]`** (не одна строка `title`);
- **`mileage`** этого заказ-наряда (пробег на работах).

Иначе UI кажется «урезанным». Подробно:
[`backend-vehicle-history-works.md`](./backend-vehicle-history-works.md).

## C4. Create vs update при найденном авто

Найденное авто:

- **не** `POST /intake/clients-with-vehicle`
- `PUT /clients/{id}` + `PATCH /vehicles/{id}`
- `POST /repairs` с `vehicle_id` (**не** создавать нового client/vehicle)

Intake — только когда авто/клиента ещё нет.

## C5. Согласование сметы — поля и endpoints

Поля `repair_orders`:

- `estimate_status`: `pending|approved|declined` nullable
- `estimate_comment` nullable
- `estimate_decided_at` nullable

Публично (legacy пока ок):

- `GET /public/repairs/{token}` — `total`, `total_formatted`, `estimate_*`
- `POST /public/repairs/{token}/estimate` — `decision` + optional `comment`

Staff: `PATCH /repairs/{id}` принимает `estimate_status: "pending"`; `GET` отдаёт `estimate_*`.

## C6. Уже используется фронтом (проверить)

| Метод                            | Назначение                                      |
| -------------------------------- | ----------------------------------------------- |
| `GET /public/repairs/{token}`    | Публичная страница (JSON alias)                 |
| `PATCH /repairs/{repair}`        | Дата, comment, mileage, total, estimate, status |
| `PATCH /repairs/{repair}/status` | Быстрая смена статуса                           |
| `GET /auth/me`                   | Имя мастера                                     |

`POST /repairs/{id}/public-link` — deprecated после vehicle-token.

## C7. Желательно

- Нормализация телефона E.164 / `+7...`
- Стабильные `422` с `errors: { field: ["..."] }`
- OpenAPI: `total`, `estimate_*`, новые статусы

---

## Итоговый порядок работ для бэкендера

1. A1 — duplicate `public_token`
2. A2 — `show()` без redirect, JSON alias
3. A3 — whitelist статусов (`pending_approval`, `completed`)
4. **Пробег: обязательная серверная валидация минимума** —
   [`backend-mileage.md`](./backend-mileage.md)
5. **Подтверждение клиентом после «Выдан»** —
   [`backend-client-confirm.md`](./backend-client-confirm.md)
6. C1 — route binding work-items/parts
7. C2 — persist `total`
8. B / C5 — vehicle public payload + estimate flow (+ `mileage` в public history)
9. C3–C4 — история авто, update vs create
10. Сообщить фронту, когда можно окончательно перейти на `/public/vehicles/...`
