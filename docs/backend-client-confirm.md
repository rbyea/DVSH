# Backend: подтверждение клиентом после «Выдан»

После статуса **`completed` («Выдан»)** клиент по публичной ссылке проверяет данные заказа и
подтверждает их.

Правила продукта:

1. Сразу после «Выдан» СТО **не редактирует** заказ (пока клиент не сообщил об ошибке).
2. Клиент: **подтвердить** или **есть ошибка** (+ комментарий).
3. После **подтверждения** — навсегда только чтение.
4. После **ошибки** — СТО снова может править и отправить на подтверждение повторно.

---

## Поля `repair_orders`

| Поле                     | Тип                                        | Описание                           |
| ------------------------ | ------------------------------------------ | ---------------------------------- |
| `client_confirm_status`  | `pending \| confirmed \| disputed \| null` | Состояние подтверждения            |
| `client_confirm_comment` | text nullable                              | Комментарий клиента при `disputed` |
| `client_confirmed_at`    | datetime nullable                          | Когда клиент подтвердил            |

---

## Поведение при `status → completed`

Автоматически:

```text
client_confirm_status = pending
client_confirm_comment = null
client_confirmed_at = null
```

Floor пробега (`last_completed_mileage`) — как в [`backend-mileage.md`](./backend-mileage.md).

---

## Блокировка правок (staff)

| `client_confirm_status` | Staff edit                      |
| ----------------------- | ------------------------------- |
| `pending`               | **запрещено** (`403` / `422`)   |
| `confirmed`             | **запрещено навсегда**          |
| `disputed`              | **разрешено** (чтобы исправить) |
| `null` (не completed)   | по обычным правилам             |

Запрет касается: `PATCH /repairs/{id}`, `PATCH .../status`, CRUD work-items/parts, update
client/vehicle **в контексте этого закрытого заказа** (данные snapshot заказа).

**Исключение:** при `disputed` разрешён `PATCH /repairs/{id}` с `client_confirm_status: "pending"`
(«Отправить снова») и правки полей до повторной отправки.

---

## Public endpoint

### `POST /api/v1/public/vehicles/{token}/confirm`

```json
{
  "decision": "confirmed",
  "comment": null
}
```

или

```json
{
  "decision": "disputed",
  "comment": "Неверный VIN, должно быть ..."
}
```

Условия:

- есть `current_repair` со `status = completed`
- `client_confirm_status = pending`
- для `disputed` — `comment` обязателен (не пустой)

Ответ: тот же shape, что `GET /public/vehicles/{token}`.

При `confirmed`:

- `client_confirm_status = confirmed`
- `client_confirmed_at = now()`
- заказ может уйти в `previous_repairs` (см. ниже)

При `disputed`:

- `client_confirm_status = disputed`
- `client_confirm_comment = comment`
- заказ остаётся в `current_repair`, staff может править

---

## Публичный payload

Пока `client_confirm_status` ∈ `{ pending, disputed }`:

- этот заказ **остаётся в `current_repair`**, даже если `status = completed`
- иначе клиент не сможет подтвердить

После `confirmed`:

- заказ уходит в `previous_repairs` (если нет другого активного ремонта)
- `current_repair` = следующий активный или `null`

В `current_repair` и staff `GET /repairs/{id}` отдавать:

```json
{
  "client_confirm_status": "pending",
  "client_confirm_comment": null,
  "client_confirmed_at": null,
  "client_name": "Иван Петров",
  "mileage": 87200,
  "work_items": [{ "title": "Замена масла", "is_done": true }]
}
```

`client_name` обязателен на публичке для проверки клиентом.  
VIN / шасси — на уровне vehicle (`vin`, `chassis_number`), как сейчас.

---

## Staff: повторная отправка

После правок при `disputed`:

```http
PATCH /api/v1/repairs/{id}
{ "client_confirm_status": "pending" }
```

Сервер:

- `client_confirm_status = pending`
- `client_confirm_comment = null`
- `client_confirmed_at = null`

---

## Acceptance

- [ ] `completed` → `client_confirm_status = pending`
- [ ] pending/confirmed → staff не может менять заказ
- [ ] disputed → staff может править + «Отправить снова»
- [ ] `POST .../confirm` confirmed / disputed работает
- [ ] pending/disputed остаются в `current_repair`
- [ ] confirmed уходит в историю; дальше неизменяем
- [ ] в payload есть `client_name`, `mileage`, `work_items`, `client_confirm_*`

---

## Коротко бэкендеру

> После «Выдан» выставь `client_confirm_status=pending` и заблокируй staff-правки. Клиент через
> `POST /public/vehicles/{token}/confirm` подтверждает или пишет ошибку. Пока pending/disputed —
> заказ в `current_repair`. После confirmed — навсегда только чтение.
