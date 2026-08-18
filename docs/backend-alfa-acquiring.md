# Альфа-эквайринг: оплата тарифов (ТЗ для Laravel)

Бэкенд: Laravel, база `/api/v1`. Фронт: React SPA (Автовидно / DVSH). Продавец: ИП Новиков Егор
Сергеевич, ИНН 650202270142, ОГРНИП 325237500256209 — **на НПД** (чеки в «Мой налог» формирует
Альфа-Банк как партнёр ФНС).

## Продукт

Пользователь на `/billing` выбирает тариф (1 мес — 1 200 ₽ · 3 мес — 3 300 ₽ · 12 мес — 12 000 ₽) и
жмёт «Оплатить»:

```
/billing (фронт)
   → POST /billing/payments { plan: month|quarter|year }
   → Laravel: register-запрос в шлюз Альфы
   → redirect на платёжную страницу Альфы (своей формы НЕ рисуем)
   → клиент платит → ReturnUrl → /billing/success?orderId=...
   → вебхук Альфы → /api/v1/billing/webhook (подтверждение)
   → subscription_status = active, subscription_ends_at = now + N мес
```

## 1. Данные банка (env Laravel)

| Переменная         | Назначение                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `ALFA_GATEWAY_URL` | URL шлюза (test/prod)                                             |
| `ALFA_USERNAME`    | логин API                                                         |
| `ALFA_PASSWORD`    | пароль API                                                        |
| `ALFA_RETURN_URL`  | куда вернуть клиента после оплаты (`https://.../billing/success`) |
| `ALFA_WEBHOOK_URL` | куда шлёт вебхуки (`https://.../api/v1/billing/webhook`)          |

Токены/пароли — только в env, на фронт не отдаются.

## 2. Эндпоинты

### `POST /billing/payments` (auth)

Body: `{ "plan": "month" | "quarter" | "year" }`.

Валидация: план существует, сумма из серверного справочника тарифов (не из запроса), у станции нет
непогашенного платежа на этот план.

Ответ: `{ "data": { "payment_id", "payment_url" } }` — `payment_url` = ссылка на платёжную страницу
Альфы (redirect на неё).

Логика:

1. Создать `payments` (id, service_station_id, plan, amount, status=pending, created_at).
2. `register`-запрос в шлюз Альфы: сумма (копейки), `orderNumber = payment_id`, `returnUrl`,
   `failUrl`, `notificationUrl = ALFA_WEBHOOK_URL`.
3. Сохранить `alfa_order_id` в `payments`, отдать `payment_url`.

### `POST /billing/webhook` (без auth, проверка по подписи/паролю)

Обработка уведомлений шлюза о статусе (`approved` / `declined` и пр.).

При `approved`:

```
payments.status = paid, paid_at = now
service_stations.subscription_status = active
service_stations.subscription_ends_at = now + plan.months мес (от текущей даты,
   либо продлевает действующую подписку)
```

Идемпотентность: повторные вебхуки по оплаченному платежу не меняют `subscription_ends_at` дважды.

### `GET /billing/success?orderId=...` (SPA-страница)

Фронт после returnUrl: показывает «Оплачено», дёргает `/auth/me` (уже есть) — статус подписки
обновится.

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

## 4. Тарифы (серверный справочник, совпадает с фронтом)

| plan    | месяцев | ₽     |
| ------- | ------- | ----- |
| month   | 1       | 1200  |
| quarter | 3       | 3300  |
| year    | 12      | 12000 |

Цены на фронте: `src/features/billing/model/plans.ts` (не менять без синхронизации).

## 5. Продление и отмена

- Сервис **не списывает деньги автоматически** — клиент продлевает сам, оплачивая снова (НПД-чеки
  формируются на каждое поступление).
- После `subscription_ends_at` → `expired` (уже реализовано в штатном цикле/403).

## 6. Фронтенд (React, отдельная задача)

- `/billing`: выбор тарифа → кнопка «Оплатить» → `POST /billing/payments` →
  `window.location = payment_url`.
- Подтверждение оплаты: API `billingApi` с endpoint'ами `createBillingPayment`, `getBillingStatus`
  (по payment_id) + страница успеха на `/billing/success`.
- Не показывать «Оплатить», если подписка активна и покрывает период.

## Проверки перед релизом

1. Тестовая среда Альфы: успешная оплата, отмена, повторный вебхук (идемпотентность).
2. `payment_url` открывается без авторизации у клиента (платит владелец, в лк авторизован — не
   критично).
3. НПД: поступление отражается в «Мой налог» автоматически (подтвердить с банком).
4. Deep link /billing/success работает через SPA fallback.
