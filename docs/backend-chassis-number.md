# Backend: номер шасси автомобиля (`chassis_number`)

Нужно новое поле автомобиля для случаев, когда **нет VIN**.

Фронт уже готов слать и показывать `chassis_number`.

---

## Цель

У части авто (особенно старые / рамы / спецтехника) нет VIN 17 символов.  
Сейчас create/update vehicle требует VIN → такие авто нельзя завести.

Правило MVP:

- есть **VIN** → `chassis_number` необязателен
- **нет VIN** → обязателен **`chassis_number`** (номер шасси)
- нельзя сохранить авто без VIN и без шасси

---

## 1. БД / модель `vehicles`

Добавить колонку:

| field            | type              | notes              |
| ---------------- | ----------------- | ------------------ |
| `chassis_number` | `string` nullable | номер шасси / рамы |

Рекомендации:

- `vin` сделать **nullable** (если ещё required)
- unique на `vin` — только среди непустых (`UNIQUE` где `vin IS NOT NULL`, или partial unique)
- unique на `chassis_number` — аналогично среди непустых (в рамках `service_station_id`, если
  уникальность станционная)
- индексы для поиска: `vin`, `chassis_number`, `license_plate`

Миграция данных: существующие записи без шасси ок (`null`).

---

## 2. Валидация API

Везде, где принимается авто:

- `POST /intake/clients-with-vehicle`
- `POST /vehicles`
- `PATCH /vehicles/{vehicle}`
- (если есть) store repair с inline vehicle fields

### Поля

```json
{
  "car_model": "Toyota Land Cruiser",
  "license_plate": "А123ВС 777",
  "vin": null,
  "chassis_number": "HZJ1050123456",
  "mileage": 180000
}
```

или

```json
{
  "vin": "JTNB11HK703456789",
  "chassis_number": null
}
```

### Правила

```text
vin — nullable|string|size:17 (формат VIN без I/O/Q — как сейчас)
chassis_number — nullable|string|min:5|max:25 (A-Z, 0-9, дефис)

required_without:
  - vin required_without:chassis_number
  - chassis_number required_without:vin
```

Laravel-пример:

```php
'vin' => ['nullable', 'string', 'size:17', 'required_without:chassis_number'],
'chassis_number' => ['nullable', 'string', 'min:5', 'max:25', 'required_without:vin'],
```

Пустую строку нормализовать в `null`.

---

## 3. Ответы API — отдавать поле

Добавить `chassis_number` в:

- `GET /vehicles/search`
- `GET /vehicles/{id}`
- `POST /intake/clients-with-vehicle` → `vehicle`
- `GET/PATCH /repairs/{id}` → `vehicle`
- `GET /public/vehicles/{token}` (и legacy public repairs)

Пример search item:

```json
{
  "id": "6",
  "car_model": "Toyota vitz",
  "license_plate": "А123АР 124",
  "vin": null,
  "chassis_number": "HZJ1050123456",
  "mileage": 18000,
  "previous_repairs": []
}
```

Публичка:

```json
{
  "car_model": "...",
  "license_plate": "...",
  "vin": null,
  "chassis_number": "HZJ1050123456",
  "current_repair": {},
  "previous_repairs": []
}
```

---

## 4. Поиск

`GET /vehicles/search?q=...` должен искать и по:

- гос номеру
- VIN
- **`chassis_number`**
- (как сейчас) модели / клиенту — если уже есть

---

## 5. Что фронт шлёт

Create intake / update vehicle:

- `vin`: string \| null
- `chassis_number`: string \| null

UI: если VIN пустой — показывается и валидируется «Номер шасси».

---

## Acceptance

- [ ] Можно создать авто **без VIN**, с `chassis_number`
- [ ] Можно создать авто **с VIN**, без шасси
- [ ] Нельзя создать авто без VIN и без шасси → `422`
- [ ] `PATCH /vehicles/{id}` принимает/обновляет `chassis_number`
- [ ] Search находит по номеру шасси
- [ ] Staff repair detail и public card отдают `chassis_number`
- [ ] Unique/null для `vin` не ломает несколько авто без VIN

---

## Коротко бэкендеру

> Добавь `vehicles.chassis_number` (nullable).  
> `vin` nullable. Обязателен **хотя бы один** из: `vin` / `chassis_number`.  
> Отдавать и принимать поле во всех vehicle/intake/public endpoint’ах. Search — по шасси тоже.
