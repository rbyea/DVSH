# Backend: несколько автомобилей у одного клиента

Фронт готов показывать список авто в карточке клиента и добавлять новое авто к существующему
клиенту.

---

## Контракт

### `GET /api/v1/clients/{id}`

Карточка клиента + автомобили:

```json
{
  "data": {
    "id": "10",
    "name": "Иван Петров",
    "phone": "+79991112233",
    "email": "petrov@example.com",
    "vehicles": [
      {
        "id": "1",
        "car_model": "Toyota Camry",
        "license_plate": "А123ВС777",
        "vin": "JTNB11HK703456789",
        "chassis_number": null,
        "mileage": 87200
      },
      {
        "id": "2",
        "car_model": "VW Polo",
        "license_plate": "В456ОР777",
        "vin": null,
        "chassis_number": "HZJ1050123456",
        "mileage": 120000
      }
    ]
  }
}
```

### `POST /api/v1/vehicles`

Добавить авто **существующему** клиенту:

```json
{
  "client_id": 10,
  "car_model": "VW Polo",
  "license_plate": "В456ОР777",
  "vin": null,
  "chassis_number": "HZJ1050123456",
  "mileage": 120000
}
```

Правила:

- `client_id` — **required** (не создавать нового клиента)
- VIN **или** `chassis_number` (как в chassis ТЗ)
- `license_plate`, `car_model` — required
- уникальность VIN/шасси в рамках станции

**Response `201`:**

```json
{
  "data": {
    "id": "2",
    "client_id": "10",
    "car_model": "VW Polo",
    "license_plate": "В456ОР777",
    "vin": null,
    "chassis_number": "HZJ1050123456",
    "mileage": 120000
  }
}
```

Старый body с `client_name` (без `client_id`) можно оставить для совместимости, но для «добавить
авто клиенту» нужен именно `client_id`.

---

### `GET /api/v1/public/vehicles/{token}`

В публичной карточке нужны авто того же клиента, чтобы клиент видел **количество** и
**переключался** между машинами (клик → другая история/текущий ремонт).

Добавить в payload:

```json
{
  "data": {
    "car_model": "Toyota Camry",
    "license_plate": "А123ВС777",
    "vin": "…",
    "chassis_number": null,
    "client_name": "Иван Петров",
    "current_repair": {},
    "previous_repairs": [],
    "client_vehicles": [
      {
        "public_token": "token-camry",
        "car_model": "Toyota Camry",
        "license_plate": "А123ВС777",
        "vin": "…",
        "chassis_number": null
      },
      {
        "public_token": "token-polo",
        "car_model": "VW Polo",
        "license_plate": "В456ОР777",
        "vin": null,
        "chassis_number": "…"
      }
    ]
  }
}
```

Правила:

- `client_vehicles` — все авто этого клиента на станции (включая текущее)
- у каждого свой `public_token` (как у текущего URL)
- без токенов фронт не покажет переключатель

Фронт: клик по другому авто → `/public/vehicles/{public_token}` (подгрузятся его `current_repair` +
`previous_repairs`).

---

## Acceptance

- [ ] `GET /clients/{id}` отдаёт `vehicles[]`
- [ ] `POST /vehicles` с `client_id` создаёт второе/третье авто
- [ ] Не создаёт дубликат клиента
- [ ] VIN/шасси валидируются как в staff create
- [ ] `GET /public/vehicles/{token}` отдаёт `client_vehicles[]` с `public_token`

---

## Коротко

> Один клиент — много авто. Staff: `GET /clients/{id}` + `POST /vehicles` с `client_id`. Публичка:
> `client_vehicles[]` с токенами для переключения между машинами.
