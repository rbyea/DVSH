# Backend: мастера СТО и назначение на работы

Фронт:

- `/station` — справочник мастеров (ФИО + профессия, **без** email/пароля)
- в списке работ заказ-наряда у каждой работы выбирается мастер (можно менять)

Мастера — **не** учётки для входа. Логин по-прежнему у staff-пользователей (`/auth`).

---

## Модель `masters` (или `station_masters`)

| Поле               | Тип    | Описание                                   |
| ------------------ | ------ | ------------------------------------------ |
| id                 | PK     |                                            |
| service_station_id | FK     | станция                                    |
| full_name          | string | ФИО                                        |
| specialty          | string | профессия (механик, электрик…)             |
| is_active          | bool   | default true; скрыт из селекта, если false |
| timestamps         |        |                                            |

---

## Эндпоинты справочника

### `GET /api/v1/station`

```json
{ "data": { "id": "1", "name": "СТО на Ленина", "master_share_percent": 50 } }
```

`master_share_percent` — доля мастера от цены работы в %, default **50** (мастер 50% / СТО 50%).

### `PATCH /api/v1/station`

```json
{ "name": "СТО на Ленина", "master_share_percent": 50 }
```

### `GET /api/v1/station/masters`

```json
{
  "data": [
    {
      "id": "10",
      "full_name": "Иванов Иван Иванович",
      "specialty": "Механик",
      "is_active": true,
      "created_at": "2026-08-10T10:00:00Z"
    }
  ]
}
```

### `POST /api/v1/station/masters`

```json
{
  "full_name": "Иванов Иван Иванович",
  "specialty": "Автоэлектрик"
}
```

**201:** объект мастера. Email/password **не** принимать.

### `PATCH /api/v1/station/masters/{id}`

```json
{ "full_name": "…", "specialty": "…", "is_active": false }
```

### `DELETE /api/v1/station/masters/{id}`

Удаление. В уже сохранённых `work_items` желательно оставить snapshot `master` (full_name +
specialty) или nullable FK.

---

## Назначение на работы

В `repair_work_items`:

| Поле      | Тип                  | Описание                                                        |
| --------- | -------------------- | --------------------------------------------------------------- |
| master_id | FK nullable          | мастер                                                          |
| price     | decimal/int nullable | цена позиции, ₽                                                 |
| hours     | decimal nullable     | часы                                                            |
| is_extra  | bool                 | default `false`; доп. работа (отдельный блок и сумма на фронте) |

### Create / update work item

`POST /repairs/{id}/work-items`

```json
{ "title": "Замена масла", "master_id": 10, "price": 3500, "hours": 1.5, "is_extra": false }
```

`PATCH /repairs/{id}/work-items/{workItemId}`

```json
{ "master_id": 10, "price": 3500, "hours": 2, "is_extra": true }
```

или `{ "master_id": null }` — снять назначение.

### `GET /repairs/{id}` → `work_items[]`

```json
{
  "id": "1",
  "title": "Замена масла",
  "is_done": false,
  "is_extra": false,
  "price": 3500,
  "hours": 1.5,
  "master_id": "10",
  "master": {
    "id": "10",
    "full_name": "Иванов Иван Иванович",
    "specialty": "Механик"
  }
}
```

### `POST /repairs` → `work_items[]`

```json
{
  "work_items": [
    { "title": "Диагностика", "master_id": 10, "price": 2000, "hours": 1, "is_extra": false },
    { "title": "Полировка", "master_id": null, "price": 5000, "hours": 2, "is_extra": true }
  ]
}
```

---

## Acceptance

- [ ] CRUD `/station/masters` (без email/password)
- [ ] `GET/PATCH /station` (+ `master_share_percent`, default 50)
- [ ] `work_items.master_id` + nested `master` в GET repair
- [ ] `work_items.price` + `work_items.hours` + `work_items.is_extra` в GET/POST/PATCH
- [ ] create/update work item и create repair принимают `master_id`, `price`, `hours`, `is_extra`
- [ ] `is_active=false` — не показывать в новых назначениях (уже назначенные ок)

### Dashboard search

`GET /api/v1/repairs?search=...` должен искать также по:

- ФИО клиента (`clients.name`)
- ФИО мастера на работах (`masters.full_name` через work_items)

---

## Коротко

> Мастера = справочник ФИО + профессия. На каждую работу в заказе — свой `master_id`, можно менять.
