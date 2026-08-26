# Альфа-эквайринг: оплата тарифов (ТЗ для Laravel)

Бэкенд: Laravel, база `/api/v1`. Фронт: React SPA (Автовидно / DVSH). Продавец: ИП Новиков Егор
Сергеевич, ИНН 650202270142, ОГРНИП 325237500256209 — **на НПД** (чеки в «Мой налог» формирует
Альфа-Банк как партнёр ФНС).

Фронт с 24.08 вызывает `POST /billing/payments` и редиректит на `payment_url`. Пароли Альфы только в
`.env` Laravel, на фронт не отдавать.

REST-дока для логина с префиксом `r-` (наш случай):
https://alfabank.ru/sme/payservice/internet-acquiring/docs/connection-options/api-r/ Боевой REST:
`https://payment.alfabank.ru/payment/rest`. Дока **без** `r-` (`/docs/.../api/`, хост
`pay.alfabank.ru`) — другой контур, не наш.

---

## Продукт

Пользователь на `/station#subscription` выбирает тариф и жмёт «Оплатить»:

```
фронт POST /api/v1/billing/payments { plan }
  → Laravel register.do в шлюз Альфы
  → { data: { payment_id, payment_url } }
  → window.location = payment_url (форма Альфы, своей формы карты нет)
  → клиент платит
  → ReturnUrl: https://autovidno.tw1.ru/station?orderId=<alfa orderId>
  → фронт GET /billing/payments?alfa_order_id=... + /auth/me
  → webhook / getOrderStatusExtended → subscription_status = active
```

`/billing` на фронте редиректит на `/station#subscription`. Отдельную `/billing/success` не делать.
В `returnUrl` **нельзя** ставить `#subscription`: Альфа дописывает `?orderId=` и якорь ломается.
Фронт сам откроет вкладку «Подписка», если в query есть `orderId`.

`failUrl`: `https://autovidno.tw1.ru/station?payment=fail`

---

## 1. Env Laravel (пароль не писать в git)

Боевой шлюз. В `register.do` идёт **только API-логин** (`-api`) и его пароль.

| Назначение        | Логин                      | Куда            |
| ----------------- | -------------------------- | --------------- |
| API               | `r-autovidno_tw1-api`      | `ALFA_USERNAME` |
| Кабинет оператора | `r-autovidno_tw1-operator` | не в `.env`     |
| Merchant          | `r-autovidno_tw1`          | не в `.env`     |

Пароль API бэку **нужен**. Передать лично, класть только в `.env` на сервере. В md, PR и фронт —
нет.

```env
ALFA_GATEWAY_URL=https://payment.alfabank.ru/payment/rest
ALFA_USERNAME=r-autovidno_tw1-api
ALFA_PASSWORD=          # боевой пароль логина -api
ALFA_RETURN_URL=https://autovidno.tw1.ru/station
ALFA_FAIL_URL=https://autovidno.tw1.ru/station?payment=fail
ALFA_WEBHOOK_URL=https://autovidno.tw1.ru/api/v1/billing/webhook
```

Форма `securepayecom.com` / `.../merchants/ecom2/payment.html` — это `formUrl` из `register.do`, не
`ALFA_GATEWAY_URL`. `ecom.alfabank.ru` и `pay.alfabank.ru` для логина `r-*` не использовать.

UAT (`alfa.rbsuat.com`) больше не использовать. После смены URL на сервере:
`php artisan config:clear`.

На сервере нужен сертификат Минцифры для `payment.alfabank.ru` (как для MAX).

---

## 2. Эндпоинты фронта

### `POST /billing/payments` (auth)

Body: `{ "plan": "month" | "quarter" | "year" }`.

Сумма **только** из серверного справочника, не из запроса.

Ответ: `{ "data": { "payment_id": "…", "payment_url": "https://…" } }`.

Логика:

1. Создать `payments` (station, plan, amount, status=pending).
2. `POST {ALFA_GATEWAY_URL}/register.do`  
   `Content-Type: application/x-www-form-urlencoded`

   | поле                 | значение                                                          |
   | -------------------- | ----------------------------------------------------------------- |
   | `userName`           | `ALFA_USERNAME`                                                   |
   | `password`           | `ALFA_PASSWORD`                                                   |
   | `orderNumber`        | уникальный id платежа в нашей базе (строка ≤ 36)                  |
   | `amount`             | сумма в **копейках** (1200 ₽ → `120000`)                          |
   | `currency`           | `810` (рубль в шлюзе RBS; `643` на UAT даёт «Неизвестная валюта») |
   | `language`           | `ru`                                                              |
   | `returnUrl`          | `ALFA_RETURN_URL`                                                 |
   | `failUrl`            | `ALFA_FAIL_URL`                                                   |
   | `description`        | `Автовидно, тариф {plan}`                                         |
   | `dynamicCallbackUrl` | `ALFA_WEBHOOK_URL`                                                |

3. Успех шлюза: JSON `orderId` + `formUrl`. Сохранить `alfa_order_id`, отдать
   `payment_url = formUrl`.
4. Ошибка шлюза: `errorCode` ≠ 0 / нет `formUrl` → 502, текст `errorMessage`, платёж `failed`.

Не держать два `pending` на одну станцию и тот же plan: 422.

### `GET /billing/payments` (auth)

Без query — история оплат текущей станции, новые сверху, до 50 записей:

`{ "data": [ { "id", "plan", "amount", "status", "alfa_order_id", "paid_at", "created_at" } ] }`

С `?alfa_order_id=` — один платёж и сверка со шлюзом, как раньше. Нет платежа → 404.

### `POST /billing/webhook` (без auth сессии)

Callback Альфы на `dynamicCallbackUrl`. Проверка, что заказ наш. При успехе — как ниже.
Идемпотентность: повторно не двигать `subscription_ends_at`.

При `approved` / успешном статусе:

```
payments.status = paid, paid_at = now
subscription_status = active
subscription_ends_at = max(now, текущий ends_at) + plan.months
```

Trial: отсчёт от `now`, не от конца триала.

---

## 3. Миграция

```php
Schema::create('payments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('service_station_id')->constrained()->cascadeOnDelete();
    $table->string('plan'); // month | quarter | year
    $table->unsignedInteger('amount'); // рубли
    $table->string('status')->default('pending'); // pending | paid | declined | failed
    $table->string('alfa_order_id')->nullable()->index();
    $table->timestamp('paid_at')->nullable();
    $table->timestamps();
});
```

---

## 4. Тарифы (серверный справочник, совпадает с фронтом)

| plan    | месяцев | ₽     |
| ------- | ------- | ----- |
| month   | 1       | 1200  |
| quarter | 3       | 3300  |
| year    | 12      | 12000 |

Цены на фронте: `src/features/billing/model/plans.ts`.

---

## 5. Продление

Сервис **не списывает** сам. Повторная оплата выбранного тарифа. После `subscription_ends_at` →
`expired` (уже есть).

---

## 6. Фронтенд (сделано 24.08)

- `/station#subscription`: «Оплатить» / «Продлить» → `POST /billing/payments` → редирект на Альфу.
- Возврат `?orderId=` → `GET /billing/payments?alfa_order_id=` + `/auth/me`.
- `?payment=fail` → тост «оплата не прошла».
- Логин `-api` и пароль на фронте **нет**.

---

## Проверки на проде

1. Выкат Laravel: `POST /billing/payments` с JWT отвечает `payment_url` на `payment.alfabank.ru` (не
   `rbsuat`).
2. Оплата **боевой** картой на небольшую сумму, затем возврат в кабинете при необходимости.
3. ReturnUrl открывает `/station`, вкладка «Подписка», статус `active`.
4. Повторный webhook не удваивает срок.
5. Отмена на форме Альфы → `?payment=fail`, подписка не меняется.

Кабинет оператора — логин `-operator`. К API это не относится.
