# Backend: ручная дефектовка авто (`vehicle_inspections`)

## Что сделано

Таблица `vehicle_inspections` + CRUD на карточке авто (не CSV-сканер).

### Эндпоинты (`auth:api` + `subscription.active`)

| Метод    | URL                                                    |
| -------- | ------------------------------------------------------ |
| `GET`    | `/api/v1/vehicles/{vehicle}/inspections`               |
| `POST`   | `/api/v1/vehicles/{vehicle}/inspections`               |
| `PATCH`  | `/api/v1/vehicles/{vehicle}/inspections/{inspection}`  |
| `DELETE` | `/api/v1/vehicles/{vehicle}/inspections/{inspection}`  |
| `POST`   | `/api/v1/vehicles/{vehicle}/inspections/mark-in-order` |

### Поля

- `finding` — что не так (опционально)
- `title` — что сделать (обязательно)
- `action` — `replace` | `repair` | `check`
- `urgency` — `now` | `recommended` | `later`
- `note` — комментарий
- `status` — `open` | `in_order` | `done`

`mark-in-order` body: `{ "item_ids": ["1", "2"] }` — помечает открытые пункты как `in_order`.

### Деплой

```bash
cd egor
php artisan migrate --force
```

Тесты: `php vendor/phpunit/phpunit/phpunit --filter=VehicleInspectionTest`

Фронт уже ходит на эти URL (localStorage убран).
