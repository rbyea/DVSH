# Backend: пробег — обязательная проверка на API

Статус: **обязательно на бэке** (фронт только UX; источник истины — сервер).

Связано: публичная карточка клиента, create/update repair, статус `completed` («Выдан»).

---

## Главное требование

Проверку «пробег не ниже последнего выданного» **нельзя оставлять только на фронте**.

Любой клиент API (Postman, другой UI, баг фронта) должен получать отказ от Laravel:

- `POST /api/v1/repairs`
- `PATCH /api/v1/repairs/{id}` (поле `mileage`)
- `POST /api/v1/intake/clients-with-vehicle` (если принимает `mileage`)
- `PATCH /api/v1/vehicles/{id}` (если позволяет менять `mileage` в обход ремонта)

→ при нарушении правила: **`422`**, не `200` с «кривым» пробегом.

Фронт уже показывает подсказки и тосты — это **не замена** серверной валидации.

---

## Бизнес-правило

1. У заказ-наряда есть `mileage` — пробег **на момент этих работ**.
2. Когда ремонт переводят в **`completed` («Выдан»)**:
   - `mileage` этого ремонта **фиксируется** (snapshot);
   - обновляется floor авто: `vehicles.last_completed_mileage` (и/или `vehicles.mileage`).
3. Для **любого следующего** create/update:
   - если `mileage` передан и floor известен →  
     **`mileage >= last_completed_mileage`**
   - иначе → **`422`**.

Floor считать **только** по ремонтам со статусом `completed`  
(не `done`, не текущий открытый заказ).

---

## Реализация на Laravel (обязательно)

### Вариант A — FormRequest / кастомное правило

```php
// псевдокод
$min = $vehicle->last_completed_mileage
    ?? $vehicle->completedRepairs()->max('mileage');

Rule::when(
    $mileage !== null && $min !== null,
    ['integer', 'min:'.$min] // или кастом с текстом на русском
);
```

Лучше отдельный `MileageNotBelowLastCompleted` rule / метод сервиса, который вызывается **во всех**
точках записи mileage.

### Вариант B — доменный сервис перед save

```php
VehicleMileageGuard::assertAllowed($vehicle, $mileage);
// throws ValidationException → 422
```

Вызывать из:

- `StoreRepairRequest` / `RepairController@store`
- `UpdateRepairRequest` / `RepairController@update`
- переход статуса в `completed` (если mileage меняют вместе со статусом)
- intake / update vehicle (если применимо)

### Ответ 422

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "mileage": ["Пробег не может быть меньше 87200 км (последний выданный заказ)"]
  }
}
```

`87200` — подставить реальное значение floor.

---

## Поля БД

| Где             | Поле                                  | Назначение                                           |
| --------------- | ------------------------------------- | ---------------------------------------------------- |
| `repair_orders` | `mileage` nullable int ≥ 0            | Пробег на работах этого заказа                       |
| `vehicles`      | `mileage` nullable int                | Последний известный пробег                           |
| `vehicles`      | `last_completed_mileage` nullable int | **Floor** после «Выдан» (рекомендуется хранить явно) |

При `status → completed`:

1. Не дать завершить с `mileage < floor` (если mileage задан).
2. `last_completed_mileage = max(last_completed_mileage, repair.mileage)` (если mileage не null).
3. `vehicles.mileage = repair.mileage` (если задан и ≥ текущего).

---

## Отдавать фронту (чтобы UX совпал с бэком)

### Staff

- `GET /vehicles/search`, `GET /vehicles/{id}`:  
  `mileage`, `last_completed_mileage`, в истории `previous_repairs[]/repairs[].mileage`
- `GET/PATCH /repairs/{id}`:  
  `mileage` на ремонте + `vehicle.last_completed_mileage`

### Public

`GET /public/vehicles/{token}`:

- `current_repair.mileage`
- `previous_repairs[].mileage`

---

## Тест-кейсы для бэка (обязательно прогнать)

1. Авто без completed → любой `mileage >= 0` ок.
2. Completed с `mileage = 87000` → новый repair с `86000` → **422**.
3. Тот же сценарий через `PATCH /repairs/{id}` → **422**.
4. Новый repair с `87000` или `88000` → **201/200**.
5. Перевод в `completed` обновляет floor.
6. Обход через vehicle PATCH (если есть) тоже режется.

---

## Acceptance

- [ ] Сервер **всегда** отклоняет mileage &lt; floor (`422`)
- [ ] Нельзя обойти правилом, отправив запрос мимо фронта
- [ ] Floor обновляется только из `completed`
- [ ] Public/staff отдают `mileage` по визитам + floor на vehicle
- [ ] Текст ошибки в `errors.mileage[]` понятный, с числом км

---

## Коротко бэкендеру

> **Обязательная серверная валидация:** после «Выдан» (`completed`) пробег этого заказа — минимум
> для всех следующих create/update. Ниже — только `422` с `errors.mileage`. Фронт не считается
> защитой. Хранить `repair.mileage`, обновлять `vehicle.last_completed_mileage` при выдаче, отдавать
> поля в staff/public.
