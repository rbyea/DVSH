# Что поправить на Laravel (бэкенд)

Фронт уже шлёт нужные поля и ждёт корректные ответы. Ниже — обязательные фиксы, без которых часть UI
не заработает.

## 1. Критично: route binding work-items / parts (500)

**Сейчас:**  
`PATCH/DELETE /api/v1/repairs/{repair}/work-items/{workItem}`  
`PATCH/DELETE /api/v1/repairs/{repair}/parts/{part}`  
падают с:

`Attempt to read property "id" on string`  
в `AppServiceProvider.php` (~строка 49) — кастомный `Route::bind`.

**Нужно:**

- Исправить custom route model binding: параметр `{workItem}` / `{part}` должен резолвиться в
  модель, а не в строку, у которой потом читают `->id`.
- Скоуп: work-item/part принадлежит переданному `{repair}` и текущему `service_station_id`.
- После фикса должны работать:
  - toggle `is_done`
  - rename `title` / `name`
  - change `quantity`
  - delete

**Проверка:**

```http
PATCH /api/v1/repairs/{repair}/work-items/{id}
{ "title": "Замена масла", "is_done": true }

PATCH /api/v1/repairs/{repair}/parts/{id}
{ "name": "Фильтр", "quantity": 2 }

DELETE /api/v1/repairs/{repair}/work-items/{id}
DELETE /api/v1/repairs/{repair}/parts/{id}
```

Ожидание: `200` / `204`, без 500.

---

## 2. Критично: сохранение `total`

**Сейчас:** фронт шлёт `total` в:

- `POST /api/v1/repairs` (`StoreRepairRequest`)
- `PATCH /api/v1/repairs/{repair}` (`UpdateRepairRequest`)

Ответ принимает запрос, но в БД/`GET` часто остаётся `0`.

**Нужно:**

- Добавить `total` в `$fillable` модели `RepairOrder` (или аналог).
- Валидация: `nullable|integer|min:0`.
- Сохранять при create/update.
- Отдавать в list/detail как число + (желательно) `total_formatted`.

**Проверка:** создать ремонт с `"total": 18500` → `GET /repairs/{id}` вернёт `total: 18500`.

---

## 3. Важно: история авто в search / show

Фронт при выборе авто делает `GET /vehicles/{id}` и берёт историю:

1. из `previous_repairs` search-результата, если есть;
2. иначе из `repairs` карточки авто.

**Нужно стабильно отдавать:**

### `GET /vehicles/search`

```json
{
  "previous_repairs": [
    {
      "id": "1",
      "order_number": "Р-1012",
      "title": "Замена масла",
      "status": "done",
      "completed_at": "2026-06-12T10:00:00Z"
    }
  ]
}
```

### `GET /vehicles/{vehicle}`

```json
{
  "repairs": [
    {
      "id": "1",
      "order_number": "Р-1012",
      "status": "done",
      "updated_at": "2026-06-12T10:00:00Z",
      "total": 18500
    }
  ]
}
```

Хотя бы один из двух источников должен быть заполнен.

---

## 4. Create vs update при найденном авто

Фронт при найденном авто:

- **не** вызывает `POST /intake/clients-with-vehicle`
- делает `PUT /clients/{id}` + `PATCH /vehicles/{id}`
- затем `POST /repairs` с `vehicle_id` (+ опционально `client_id`)

**Нужно на бэке:**

- `PUT /clients/{client}` и `PATCH /vehicles/{vehicle}` реально обновляют поля.
- `POST /repairs` с `vehicle_id` **не создаёт** нового client/vehicle.
- Intake (`POST /intake/clients-with-vehicle`) — только когда авто/клиента ещё нет.

---

## 5. Уже используется фронтом (проверить наличие)

| Метод                                | Назначение                             |
| ------------------------------------ | -------------------------------------- |
| `GET /public/repairs/{token}`        | Публичная страница клиента             |
| `POST /repairs/{repair}/public-link` | Создать/обновить публичную ссылку      |
| `PATCH /repairs/{repair}`            | Дата, comment, mileage, total          |
| `PATCH /repairs/{repair}/status`     | Быстрая смена статуса                  |
| `GET /auth/me`                       | Имя мастера в хедере (`name`, `email`) |

---

## 6. Новое: согласование сметы клиентом (фронт уже готов)

Фронт показывает сумму и кнопки «Согласовать / Отклонить» на `/public/repairs/{token}`.

### Миграция / поля `repair_orders`

- `estimate_status` enum/string nullable: `pending|approved|declined`
- `estimate_comment` text nullable
- `estimate_decided_at` datetime nullable

### `GET /api/v1/public/repairs/{publicToken}`

Добавить в ответ:

- `total`, `total_formatted`
- `estimate_status`, `estimate_comment`, `estimate_decided_at`

### `POST /api/v1/public/repairs/{publicToken}/estimate` (public, без auth)

Body:

```json
{ "decision": "approved" }
```

или

```json
{ "decision": "declined", "comment": "..." }
```

Правила:

- `decision` required in:approved,declined
- `comment` required_if decision=declined
- разрешать решение только если текущий статус `pending` (или null + total > 0 → считать pending)
- после решения писать `estimate_decided_at = now()`
- вернуть обновлённый public payload

### `PATCH /api/v1/repairs/{repair}` (для мастера)

Принимать `estimate_status: "pending"` — кнопка «На согласование» / «Запросить снова».

В `GET /repairs/{repair}` отдавать те же `estimate_*` поля.

---

## 7. Желательно (не блокер UI)

- Нормализация телефона на бэке (хранить E.164 / `+7...`).
- `422` с `errors: { field: ["..."] }` — фронт мапит в поля формы.
- OpenAPI: добавить `total` и `estimate_*` в schemas.

---

## Приоритет для бэкендера

1. Fix route binding work-items/parts (500)
2. Persist `total`
3. Estimate approve endpoint + поля `estimate_*`
4. История в search/show vehicle
5. Гарантировать update (не create) при `vehicle_id`
6. Проверить public-link + public show + me
