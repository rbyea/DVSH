# DVSH REST API (Laravel)

Документация REST API для MVP SaaS СТО.

Base URL: `/api/v1`  
Auth: JWT — заголовок `Authorization: Bearer {access_token}`  
Content-Type: `application/json`  
Accept: `application/json`

---

## Общие правила

### Успешный ответ

```json
{
  "data": {}
}
```

### Список с пагинацией

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 42,
    "last_page": 3
  }
}
```

### Ошибка валидации `422`

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "vin": ["Поле VIN обязательно."]
  }
}
```

### Ошибки

| HTTP  | Описание         |
| ----- | ---------------- |
| `401` | Не авторизован   |
| `403` | Нет доступа      |
| `404` | Не найдено       |
| `422` | Ошибка валидации |
| `500` | Ошибка сервера   |

### Статусы ремонта

| Value           | Label         |
| --------------- | ------------- |
| `new`           | Новый         |
| `diagnostics`   | Диагностика   |
| `in_progress`   | В работе      |
| `waiting_parts` | Ждём запчасти |
| `done`          | Готово        |

> На фронте сейчас используется `inProgress` / `waitingParts`. На бэке лучше snake_case:
> `in_progress`, `waiting_parts`. Фронт маппит при необходимости.

---

## Флоу создания ремонта (3 шага)

Это основной сценарий фронта. Сущности создаются **по шагам**, а не одним большим `POST` в конце.

### Шаги UI

| Step | Название         | Что происходит                                               |
| ---- | ---------------- | ------------------------------------------------------------ |
| `0`  | Проверка авто    | Поиск по гос номеру / VIN                                    |
| `1`  | Создание клиента | Если авто не найдено — создать client (+ vehicle) на сервере |
| `2`  | Карточка ремонта | Создать repair к уже существующим client/vehicle             |

### Сценарий A — авто найдено

1. `GET /vehicles/search?q=...` → список совпадений
2. Пользователь выбирает авто
3. Запрос полной карточки:

```http
GET /api/v1/vehicles/{vehicle}
```

(или `GET /api/v1/vehicles/{vehicle}/card` — vehicle + client одним ответом)

4. Переход на **шаг 1** с предзаполненной формой (`clientId`, `vehicleId`, имя, телефон, модель, VIN
   и т.д.)
5. Пользователь проверяет/правит данные
6. Кнопка дальше → при изменениях `PATCH` клиента/авто, иначе просто переход на **шаг 2**
7. На шаге 2: `POST /repairs` с `vehicle_id` (+ `client_id`)

Шаг 1 **не пропускаем** — всегда показываем карточку клиента/авто.

### Сценарий B — авто не найдено

1. `GET /vehicles/search?q=...` → `[]`
2. Переход на **шаг 1** с пустой формой
3. Пользователь заполняет клиента и авто
4. Кнопка **«Создать клиента»** → сразу запрос на сервер:

```http
POST /api/v1/clients
```

или удобнее одним endpoint для приёмки:

```http
POST /api/v1/intake/clients-with-vehicle
```

5. В ответ приходят `client_id` + `vehicle_id`
6. Фронт сохраняет их в context (`clientId`, `vehicleId`)
7. Переход на **шаг 2**
8. На шаге 2 клиент/авто уже можно **редактировать**:

```http
PATCH /api/v1/clients/{client}
PATCH /api/v1/vehicles/{vehicle}
```

9. Кнопка **«Создать ремонт»**:

```http
POST /api/v1/repairs
{
  "vehicle_id": "...",
  "client_id": "...",
  "status": "new",
  "work_items": [],
  "ordered_parts": [],
  "comment": "..."
}
```

### Почему так

- шаг 1 всегда единый экран «клиент + авто» — и для найденных, и для новых;
- найденное авто: сначала карточка с сервера, потом правка;
- новое: create сразу на сервере, дальше те же id;
- финальный `POST /repairs` простой: только заказ-наряд.

### Рекомендуемый endpoint для шага 1

#### `POST /api/v1/intake/clients-with-vehicle`

Создаёт клиента и автомобиль одним запросом (удобно для шага «Создание клиента»).

**Body**

```json
{
  "client_name": "Иван Петров",
  "client_phone": "+7 999 111-22-33",
  "client_email": "petrov@example.com",
  "car_model": "Toyota Camry",
  "license_plate": "А123ВС 777",
  "vin": "JTNB11HK703456789",
  "mileage": 85400
}
```

**Response `201`**

```json
{
  "data": {
    "client": {
      "id": "10",
      "name": "Иван Петров",
      "phone": "+7 999 111-22-33",
      "email": "petrov@example.com"
    },
    "vehicle": {
      "id": "1",
      "client_id": "10",
      "car_model": "Toyota Camry",
      "license_plate": "А123ВС 777",
      "vin": "JTNB11HK703456789",
      "mileage": 85400
    }
  }
}
```

После этого на фронте:

```ts
setValue('clientId', data.client.id);
setValue('vehicleId', data.vehicle.id);
setCurrentStep(2);
```

### Что хранить в context после шага 1

- `clientId`
- `vehicleId`
- данные формы клиента/авто (для отображения и дальнейшего PATCH)
- `currentStep`

### Важно

- На шаге 1 **не** создавать repair.
- На шаге 2 `POST /repairs` требует `vehicle_id`.
- Если пользователь вернулся на шаг 1 и поменял клиента — делать `PATCH`, а не новый `POST` (если id
  уже есть).

---

## 1. Auth (JWT)

Авторизация сотрудника СТО через **JWT** (JSON Web Token).

Все защищённые endpoints требуют заголовок:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Рекомендуемый пакет на Laravel: `tymon/jwt-auth` (или аналог).  
Sanctum / session cookies **не используем**.

### `POST /api/v1/auth/login`

Получение JWT access token.

**Body**

```json
{
  "email": "master@sto.ru",
  "password": "password"
}
```

**Response `200`**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "name": "Иван Мастеров",
      "email": "master@sto.ru",
      "service_station_id": 1
    }
  }
}
```

| Поле           | Описание                      |
| -------------- | ----------------------------- |
| `access_token` | JWT-токен для `Authorization` |
| `token_type`   | Всегда `Bearer`               |
| `expires_in`   | Время жизни токена в секундах |

**Ошибка `401`** — неверный email/пароль.

Фронт сохраняет `access_token` (например в `localStorage`) и добавляет его во все API-запросы.

### `POST /api/v1/auth/refresh`

Обновление JWT до истечения срока (по текущему валидному токену).

Headers: `Authorization: Bearer {access_token}`

**Response `200`**

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

### `POST /api/v1/auth/logout`

Инвалидация текущего JWT (blacklist / invalidate).

Headers: `Authorization: Bearer {access_token}`

**Response `204`** — без тела.

### `GET /api/v1/auth/me`

Текущий пользователь по JWT.

Headers: `Authorization: Bearer {access_token}`

**Response `200`**

```json
{
  "data": {
    "id": 1,
    "name": "Иван Мастеров",
    "email": "master@sto.ru",
    "service_station_id": 1
  }
}
```

**Ошибка `401`** — токен отсутствует, просрочен или невалиден.

---

## 2. Vehicles (автомобили)

### `GET /api/v1/vehicles/search`

Поиск авто по гос номеру или VIN для шага «Проверка авто».

**Query**

| Param | Type   | Required | Description                          |
| ----- | ------ | -------- | ------------------------------------ |
| `q`   | string | yes      | Гос номер или VIN, минимум 2 символа |

**Example**

`GET /api/v1/vehicles/search?q=А123`

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid-or-int",
      "client_name": "Иван Петров",
      "client_phone": "+7 999 111-22-33",
      "client_email": "petrov@example.com",
      "car_model": "Toyota Camry",
      "license_plate": "А123ВС 777",
      "vin": "JTNB11HK703456789",
      "mileage": 85400,
      "previous_repairs": [
        {
          "id": "repair-id",
          "order_number": "Р-1012",
          "title": "Замена масла и фильтров",
          "status": "done",
          "completed_at": "2026-06-12"
        }
      ]
    }
  ]
}
```

Если ничего не найдено — `data: []`.

### `GET /api/v1/vehicles/{vehicle}`

Карточка **автомобиля** с клиентом и историей ремонтов.

Используется после поиска на шаге 0 создания ремонта (предзаполнение шага 1).  
Это не редактирование ремонта из Dashboard — для этого `GET /repairs/{repair}`.

**Response `200`**

```json
{
  "data": {
    "id": "1",
    "client": {
      "id": "10",
      "name": "Иван Петров",
      "phone": "+7 999 111-22-33",
      "email": "petrov@example.com"
    },
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС 777",
    "vin": "JTNB11HK703456789",
    "mileage": 85400,
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
}
```

### `POST /api/v1/vehicles`

Создать новую карточку авто (когда машины нет в базе).

**Body**

```json
{
  "client_name": "Иван Петров",
  "client_phone": "+7 999 111-22-33",
  "client_email": "petrov@example.com",
  "car_model": "Toyota Camry",
  "license_plate": "А123ВС 777",
  "vin": "JTNB11HK703456789",
  "mileage": 85400
}
```

**Validation**

- `client_name` — required, string
- `client_phone` — nullable, string
- `client_email` — nullable, email
- `car_model` — required, string
- `license_plate` — required, string
- `vin` — required, string, unique, size:17 (можно ослабить на MVP)
- `mileage` — nullable, integer, min:0

**Response `201`** — созданный vehicle.

---

## 3. Clients (клиенты)

### `GET /api/v1/clients`

Список клиентов СТО.

**Query**

| Param      | Type   | Description           |
| ---------- | ------ | --------------------- |
| `search`   | string | Имя / телефон / email |
| `page`     | int    | Страница              |
| `per_page` | int    | Размер страницы       |

### `GET /api/v1/clients/{client}`

Карточка клиента + его автомобили.

### `POST /api/v1/clients`

```json
{
  "name": "Иван Петров",
  "phone": "+7 999 111-22-33",
  "email": "petrov@example.com"
}
```

### `PUT /api/v1/clients/{client}`

Обновление клиента.

---

## 4. Repair Orders (ремонты)

### `GET /api/v1/repairs`

Список ремонтов для **Dashboard** (таблица заказ-нарядов).

Клик по строке → открыть ремонт на редактирование → `GET /api/v1/repairs/{repair}`.

**Query**

| Param      | Type   | Description                                                  |
| ---------- | ------ | ------------------------------------------------------------ |
| `search`   | string | ФИО клиента / ФИО мастера / номер ремонта / машина           |
| `status`   | string | `new`, `diagnostics`, `in_progress`, `waiting_parts`, `done` |
| `page`     | int    | Страница                                                     |
| `per_page` | int    | По умолчанию 15                                              |

**Response `200`**

```json
{
  "data": [
    {
      "id": "1",
      "order_number": "Р-1042",
      "client_name": "Иван Петров",
      "car": "Toyota Camry, А123ВС 777",
      "vehicle_id": "1",
      "status": "in_progress",
      "updated_at": "2026-07-29T12:40:00Z",
      "total": 18500,
      "total_formatted": "18 500 ₽"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 5,
    "last_page": 1
  }
}
```

### `GET /api/v1/repairs/{repair}`

Детальная карточка **ремонта** — для экрана редактирования из Dashboard.

Сюда попадаем из таблицы: выбрали строку → загрузили карточку → правим статус, работы, запчасти,
комментарий и т.д.  
Сохранение: `PATCH /api/v1/repairs/{repair}` (и связанные endpoints работ/запчастей).

> Не путать с `GET /vehicles/{vehicle}`: там карточка **авто** + история ремонтов (флоу создания /
> справочник авто).

**Response `200`**

```json
{
  "data": {
    "id": "1",
    "order_number": "Р-1042",
    "status": "in_progress",
    "planned_ready_at": "2026-08-01",
    "comment": "Клиент просил проверить тормоза",
    "mileage": 85400,
    "total": 18500,
    "public_token": "abc123xyz",
    "public_url": "https://app.dvsh.ru/public/repairs/abc123xyz",
    "client": {
      "id": "10",
      "name": "Иван Петров",
      "phone": "+7 999 111-22-33",
      "email": "petrov@example.com"
    },
    "vehicle": {
      "id": "1",
      "car_model": "Toyota Camry",
      "license_plate": "А123ВС 777",
      "vin": "JTNB11HK703456789",
      "mileage": 85400
    },
    "work_items": [
      {
        "id": "1",
        "title": "Замена масла",
        "is_done": false
      }
    ],
    "ordered_parts": [
      {
        "id": "1",
        "name": "Масляный фильтр",
        "quantity": 1
      }
    ],
    "created_at": "2026-07-29T09:00:00Z",
    "updated_at": "2026-07-29T12:40:00Z"
  }
}
```

### `POST /api/v1/repairs`

Создание ремонта.

#### Сценарий A — машина уже есть

```json
{
  "vehicle_id": "1",
  "status": "new",
  "planned_ready_at": "2026-08-01",
  "mileage": 86000,
  "total": 18500,
  "comment": "Посторонний шум",
  "work_items": [{ "title": "Диагностика" }],
  "ordered_parts": [{ "name": "Тормозные колодки", "quantity": 1 }]
}
```

#### Сценарий B — новой машины нет в базе

```json
{
  "client_name": "Иван Петров",
  "client_phone": "+7 999 111-22-33",
  "client_email": "petrov@example.com",
  "car_model": "Toyota Camry",
  "license_plate": "А123ВС 777",
  "vin": "JTNB11HK703456789",
  "mileage": 85400,
  "status": "new",
  "planned_ready_at": "2026-08-01",
  "comment": "Первый визит",
  "work_items": [{ "title": "Диагностика" }],
  "ordered_parts": []
}
```

**Validation**

Если есть `vehicle_id`:

- `vehicle_id` — required, exists:vehicles,id
- `client_*` / `car_*` / `vin` / `license_plate` — не обязательны

Если нет `vehicle_id`:

- `client_name`, `car_model`, `license_plate`, `vin` — required
- создаём client (или находим по телефону) + vehicle + repair

Общие:

- `status` — required, in:new,diagnostics,in_progress,waiting_parts
- `planned_ready_at` — nullable, date
- `mileage` — nullable, integer, min:0
- `total` — nullable, integer, min:0 (ориентировочная сумма заказа в рублях)
- `comment` — nullable, string
- `work_items` — array
- `work_items.*.title` — required_with:work_items, string
- `work_items.*.is_extra` — boolean, default false (доп. работа)
- `ordered_parts` — array
- `ordered_parts.*.name` — required_with:ordered_parts, string
- `ordered_parts.*.quantity` — integer, min:1
- `ordered_parts.*.price` — nullable, number, min:0 (цена за единицу, ₽)

**Response `201`**

```json
{
  "data": {
    "id": "99",
    "order_number": "Р-1043",
    "status": "new",
    "public_token": "newtoken123",
    "public_url": "https://app.dvsh.ru/public/repairs/newtoken123"
  }
}
```

### `PATCH /api/v1/repairs/{repair}`

Частичное обновление ремонта.

```json
{
  "status": "in_progress",
  "planned_ready_at": "2026-08-02",
  "comment": "Ждём согласования",
  "mileage": 86100
}
```

### `PATCH /api/v1/repairs/{repair}/status`

Быстрая смена статуса.

```json
{
  "status": "waiting_parts"
}
```

---

## 5. Work items / Parts

### `POST /api/v1/repairs/{repair}/work-items`

```json
{
  "title": "Замена масла",
  "is_extra": false
}
```

### `PATCH /api/v1/repairs/{repair}/work-items/{workItem}`

```json
{
  "title": "Замена масла + фильтр",
  "is_done": true,
  "is_extra": true
}
```

### `DELETE /api/v1/repairs/{repair}/work-items/{workItem}`

### `POST /api/v1/repairs/{repair}/parts`

```json
{
  "name": "Масляный фильтр",
  "quantity": 1,
  "price": 850
}
```

`price` — цена за единицу (₽), nullable.

### `PATCH /api/v1/repairs/{repair}/parts/{part}`

### `DELETE /api/v1/repairs/{repair}/parts/{part}`

---

## 6. Public link (клиент без авторизации)

### `GET /api/v1/public/repairs/{publicToken}`

Публичная страница статуса ремонта.

**Auth:** не требуется

**Response `200`**

```json
{
  "data": {
    "order_number": "Р-1042",
    "status": "in_progress",
    "status_label": "В работе",
    "planned_ready_at": "2026-08-01",
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС 777",
    "total": 18500,
    "total_formatted": "18 500 ₽",
    "estimate_status": "pending",
    "estimate_comment": null,
    "estimate_decided_at": null,
    "work_items": [
      {
        "title": "Диагностика",
        "is_done": true
      },
      {
        "title": "Замена колодок",
        "is_done": false
      }
    ],
    "updated_at": "2026-07-29T12:40:00Z"
  }
}
```

`estimate_status`: `pending` | `approved` | `declined` | `null`

### `POST /api/v1/public/repairs/{publicToken}/estimate`

Согласование сметы клиентом (без авторизации).

```json
{
  "decision": "approved"
}
```

или

```json
{
  "decision": "declined",
  "comment": "Пока без замены колодок"
}
```

**Validation**

- `decision` — required, in:approved,declined
- `comment` — required_if:decision,declined; nullable string; max:1000
- повторное решение после `approved`/`declined` — `409` (или разрешить только если мастер снова
  выставил `pending`)

**Response `200`** — обновлённый public repair payload.

### `GET /api/v1/public/repairs/{publicToken}/pdf`

Скачать PDF истории обслуживания после завершения ремонта.

**Response `200`**

- `Content-Type: application/pdf`
- файл вложением

Если ремонт ещё не `done` — `403`.

### `POST /api/v1/repairs/{repair}/public-link`

Пересоздать/получить публичную ссылку (для СТО).

**Response `200`**

```json
{
  "data": {
    "public_token": "abc123xyz",
    "public_url": "https://app.dvsh.ru/public/repairs/abc123xyz"
  }
}
```

---

## 7. Рекомендуемые Laravel routes

```php
Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::post('auth/refresh', [AuthController::class, 'refresh']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('vehicles/search', [VehicleController::class, 'search']);
        Route::apiResource('vehicles', VehicleController::class)->only(['store', 'show']);

        Route::apiResource('clients', ClientController::class);

        Route::get('repairs', [RepairController::class, 'index']);
        Route::post('repairs', [RepairController::class, 'store']);
        Route::get('repairs/{repair}', [RepairController::class, 'show']);
        Route::patch('repairs/{repair}', [RepairController::class, 'update']);
        Route::patch('repairs/{repair}/status', [RepairController::class, 'updateStatus']);
        Route::post('repairs/{repair}/public-link', [RepairController::class, 'publicLink']);

        Route::post('repairs/{repair}/work-items', [WorkItemController::class, 'store']);
        Route::patch('repairs/{repair}/work-items/{workItem}', [WorkItemController::class, 'update']);
        Route::delete('repairs/{repair}/work-items/{workItem}', [WorkItemController::class, 'destroy']);

        Route::post('repairs/{repair}/parts', [PartController::class, 'store']);
        Route::patch('repairs/{repair}/parts/{part}', [PartController::class, 'update']);
        Route::delete('repairs/{repair}/parts/{part}', [PartController::class, 'destroy']);
    });

    Route::get('public/repairs/{publicToken}', [PublicRepairController::class, 'show']);
    Route::get('public/repairs/{publicToken}/pdf', [PublicRepairController::class, 'pdf']);
});
```

---

## 8. Модели / таблицы (минимум для MVP)

### `users`

- id, name, email, password, service_station_id, timestamps

### `service_stations`

- id, name, timestamps

### `clients`

- id, service_station_id, name, phone, email, timestamps

### `vehicles`

- id, service_station_id, client_id, car_model, license_plate, vin (unique), mileage, timestamps

### `repair_orders`

- id, service_station_id, client_id, vehicle_id
- order_number, status, planned_ready_at, comment, mileage
- total, public_token (unique), timestamps

### `repair_work_items`

- id, repair_order_id, title, is_done, timestamps

### `repair_parts`

- id, repair_order_id, name, quantity, timestamps

> Фото (`repair_photos`) — **не в MVP**, добавить позже.

---

## 9. Бизнес-правила для Laravel

1. Все private-роуты scoped по `service_station_id` текущего пользователя.
2. `VIN` уникален в рамках СТО (или глобально — на выбор).
3. При `POST /repairs`:
   - если передан `vehicle_id` → новый repair к существующему vehicle;
   - если нет → создать/найти client + создать vehicle + создать repair.
4. `order_number` генерировать на бэке (`Р-1043`).
5. `public_token` генерировать при создании ремонта (`Str::random(32)`).
6. Публичный endpoint не отдаёт телефон/email клиента без необходимости.
7. PDF доступен только при `status = done`.

---

## 10. Приоритет для MVP backend

Сделать в первую очередь:

1. JWT auth: `auth/login`, `auth/me`, `auth/refresh`, `auth/logout`
2. `GET /vehicles/search`
3. `GET /repairs`
4. `POST /repairs`
5. `GET /repairs/{id}`
6. `PATCH /repairs/{id}/status`
7. `GET /public/repairs/{token}`

Остальное можно вторым этапом.
