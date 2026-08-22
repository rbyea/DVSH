# Handoff фронт → бэкенд (18.08.2026)

Запросы от фронта по публичной карточке клиента `/public/vehicles/{token}`.

## 1. `client_vehicles` не приходит, клиент не видит свои авто

**Проблема.** На странице `/public/vehicles/XyJwITVtnXAGK0lv0L1GvjCJMh2U6HKz` блок «Ваши автомобили»
не показывается. Фронт рендерит его только при `client_vehicles.length > 0`
(`PublicVehicle.client_vehicles`, тип `PublicClientVehicleSummary`).

**Требование.** `GET /public/vehicles/{token}` должен возвращать `client_vehicles` — список всех
автомобилей клиента (включая текущий), каждый с полями:

```json
{
  "client_vehicles": [
    {
      "public_token": "строка",
      "car_model": "Toyota Camry",
      "license_plate": "А123ВС777",
      "vin": "JTDBE32K600000000",
      "chassis_number": null
    }
  ]
}
```

Без этого поля клиент не видит переключение между своими машинами (блок целиком скрыт).

## 2. `ordered_parts` в истории ремонтов

**Требование.** В `previous_repairs` для каждого заказ-наряда возвращать `ordered_parts` (название,
quantity, price) — фронт уже выводит список запчастей с ценами и включает их в сумму заказ-наряда.
Сейчас, если бэкенд не отдаёт поле, блок запчастей не показывается, а сумма считается без запчастей.

```json
{
  "previous_repairs": [
    {
      "order_number": "123",
      "ordered_parts": [
        { "name": "Колодки передние", "quantity": 1, "price": 3500 },
        { "name": "Масло 5W-30", "quantity": 4, "price": 1200 }
      ]
    }
  ]
}
```

## Текущий статус фронта

- Блок «Ваши автомобили» (переименован с «Автомобили клиента») готов и ждёт данных.
- Список запчастей в истории с ценами готов (тип `PublicRepairHistoryItem.ordered_parts`).
- Проверка после деплоя: открыть `/public/vehicles/{token}` — должен появиться блок авто и запчасти
  в «Истории по авто».
