# Backend: комментарий мастера + подготовка к выдаче СТО

Фронт уже показывает **«Комментарий мастера»** на публичной карточке клиента.  
Ниже — что сделать на Laravel + как почистить БД перед выдачей сервиса в реальное СТО.

Базовый URL: `/api/v1`

---

## Приоритет

1. Отдавать `comment` в публичном API (§1)
2. Очистка демо-данных + аккаунты (§2)

---

# §1. Комментарий мастера на карточке клиента

## Откуда берётся

Поле `repair_orders.comment` — «Комментарий мастера» в staff UI  
(создание заказа / редактирование на `/repairs/{id}`).

## Что нужно

В публичном ответе:

```http
GET /api/v1/public/vehicles/{token}
```

в `current_repair` отдавать:

```json
{
  "order_number": "Р-1062",
  "status": "in_progress",
  "status_label": "В работе",
  "comment": "Масло заменено, фильтр в наличии",
  "mileage": 87200,
  "work_items": [{ "title": "Замена масла", "is_done": true }],
  "updated_at": "2026-08-12T12:00:00Z"
}
```

| Поле               | Правило                                                      |
| ------------------ | ------------------------------------------------------------ |
| `comment`          | из `repair_orders.comment`; если пусто → `null` или не слать |
| без телефона/email | как и раньше — ПДн в public не светить лишнее                |

Legacy alias `GET /public/repairs/{token}` — тот же JSON (через vehicle).

Фронт: блок «Комментарий мастера» в секции «Текущий ремонт», только если `comment` не пустой.

## Acceptance §1

- [ ] Staff сохраняет comment → public `current_repair.comment` совпадает
- [ ] Пустой comment → блока на публичке нет
- [ ] В public нет лишних ПДн

---

# §2. Подготовка к выдаче сервиса в СТО (очистка БД)

Цель: убрать тестовые ремонты/клиентов/авто, оставить рабочий вход для вас и для СТО.

## Аккаунты после очистки

| Email           | Пароль     | Назначение                |
| --------------- | ---------- | ------------------------- |
| `master@sto.ru` | `password` | ваш / админ (оставить)    |
| `sto@sto.ru`    | `password` | аккаунт для СТО (создать) |

Рекомендация: **два разных `service_stations`**, чтобы данные СТО не смешивались с вашими тестами.

- `master@sto.ru` → станция «Автовидно / Demo» (или текущая)
- `sto@sto.ru` → новая станция, например «СТО Партнёр» (пустое состояние)

Если хотите оба на одной станции — тоже ок, но тогда история master будет видна sto (и наоборот).
Для выдачи клиенту лучше **отдельная станция**.

## Что удалить

Для **всех** станций, кроме того что явно оставляете:

- `repair_work_items`, `repair_parts`
- `repair_orders`
- `vehicles`
- `clients`

Оставить:

- `users` с `email = master@sto.ru`
- связанный `service_stations` (если нужен)
- системные таблицы (migrations, jobs, cache, personal_access_tokens — по желанию почистить токены)

## Порядок (безопасный)

1. Бэкап БД.
2. Soft-delete / hard-delete доменных данных.
3. Убедиться, что `master@sto.ru` логинится.
4. Создать станцию + пользователя `sto@sto.ru`.
5. Проверить логин `sto@sto.ru` / `password` → пустой dashboard.

### Пример (псевдокод Laravel / SQL)

```php
// 1) Найти master
$master = User::where('email', 'master@sto.ru')->firstOrFail();

// 2) Удалить доменные данные (все станции или кроме нужной — на ваш выбор)
DB::transaction(function () {
    // порядок важен из-за FK
    DB::table('repair_work_items')->delete();
    DB::table('repair_parts')->delete();
    DB::table('repair_orders')->delete();
    DB::table('vehicles')->delete();
    DB::table('clients')->delete();
    // при необходимости: public tokens / другие связанные таблицы
});

// 3) Создать станцию для СТО
$station = ServiceStation::create([
    'name' => 'СТО Партнёр',
]);

// 4) Создать пользователя СТО
User::updateOrCreate(
    ['email' => 'sto@sto.ru'],
    [
        'name' => 'СТО',
        'password' => Hash::make('password'),
        'service_station_id' => $station->id,
    ]
);
```

Или Artisan seeder / command:

```bash
php artisan dvsh:prepare-go-live
# --keep=master@sto.ru
# --create-sto=sto@sto.ru --password=password
```

## После очистки — чеклист

- [ ] `POST /auth/login` `master@sto.ru` / `password` → 200
- [ ] `POST /auth/login` `sto@sto.ru` / `password` → 200
- [ ] У `sto@sto.ru` список ремонтов пустой
- [ ] У `sto@sto.ru` свой `service_station_id` (не общий с чужими данными)
- [ ] Public comment (§1) работает на новом заказе

## Важно по безопасности

`password` — только для MVP/демо. Перед продом:

- сменить пароли
- не светить в публичных чатах
- ideally force password change при первом входе (позже)

---

## Коротко бэкендеру

1. В `GET /public/vehicles/{token}` → `current_repair.comment` = комментарий мастера.
2. Почистить клиентов/авто/ремонты; оставить `master@sto.ru`.
3. Создать `sto@sto.ru` / `password` на **новой** станции для выдачи в СТО.
