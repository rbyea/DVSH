# MAX-бот: `/start` молчит (прод, 23.08.2026)

Отдать Laravel. Фронт тут ни при чём: кнопка ведёт на `https://max.ru/id650202270142_bot`.

Базовый URL: `/api/v1`. Webhook: `POST /api/max/webhook`.

---

## Что сломано

Проверено на проде `autovidno.tw1.ru`, бот «Автовидно» (`id650202270142_bot`).

Клиент (телефон из карточки `+7 995 006-08-27`, тот же что у теста Р-1008):

1. Открыл бота, написал `/start` — **тишина**.
2. Написал номер текстом — **тишина**.

`POST https://autovidno.tw1.ru/api/max/webhook` с пустым телом отвечает `200` `{"ok":true}`. Маршрут
живой, но либо MAX на него не подписан, либо обработчик только делает ack и не отвечает в чат.

---

## Как должно работать

```
Start / bot_started
  → бот пишет приветствие
  → кнопка request_contact «Отправить номер»

Клиент жмёт кнопку (не печатает номер)
  → message_created + attachments[].type=contact (vcf_info + hash)
  → HMAC-SHA256(MAX_BOT_TOKEN, vcf_info) === hash
  → найти клиента по телефону (нормализовать к 11 цифрам, как в clients.phone)
  → подписка channel=max на все его vehicle_id
  → ответ: «Уведомления подключены для: …»

Номер не в базе СТО
  → «Номер не найден в базе СТО. Обратитесь в сервис.»

Текст «+7 …» без контакта
  → не игнорировать молча: «Нажмите кнопку “Отправить номер”, не пишите цифры руками.»
```

После подписки `GET /api/v1/repairs/{id}/notifications` не пустой: `channel=max`, `is_active=true`,
есть `chat_id`.

Смена статуса `PATCH /repairs/{id}/status` (и approve/decline сметы) → сообщение в MAX. Галочки
`work_items.is_done` уведомление **не** шлют.

---

## Что сделать на сервере

В `.env` (токен не писать в git и не слать в чат):

```env
MAX_BOT_TOKEN=
MAX_BOT_USERNAME=id650202270142_bot
MAX_WEBHOOK_URL=https://autovidno.tw1.ru/api/max/webhook
MAX_WEBHOOK_SECRET=
```

После выката:

```bash
php artisan migrate --force
php artisan config:clear && php artisan config:cache
php artisan max:webhook:set --url=https://autovidno.tw1.ru/api/max/webhook
php artisan max:commands:set
```

Проверка:

| Проверка                                                                     | Ожидание                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET https://platform-api2.max.ru/subscriptions` (Authorization: токен бота) | url на `/api/max/webhook`, в типах есть `bot_started`, `message_created` |
| `GET https://platform-api2.max.ru/me`                                        | есть команда `start`                                                     |
| Start в боте                                                                 | приходит текст + кнопка контакта, не пустой чат                          |
| Кнопка контакта с номером из карточки клиента                                | подписка в API, ответ бота со списком авто                               |
| `in_progress` → `done`                                                       | сообщение в MAX со списком выполненных работ                             |

Ошибка `Webhook URL is required` → нет `MAX_WEBHOOK_URL` или не сброшен `config:cache`. Повторить
`max:webhook:set` с `--url=...`.

Сертификат Минцифры для `platform-api2.max.ru` должен быть в доверенных на сервере, иначе исходящие
сообщения не уходят.

---

## Не делать

- Не принимать «привязку» только по тексту номера без `hash` (подделка контакта).
- Не класть `MAX_BOT_TOKEN` во фронт и в ответы API.
- Не слать уведы на каждую галочку работы.

---

## Ссылки

- Полное ТЗ канала: `docs/backend-max-notifications.md`
- Старый разбор прода 22.08: `docs/backend-station-profile.md` §3
- Отчёт бэка 23.08 (считали MAX закрытым): `docs/backend-station-profile-handoff.md` §3
