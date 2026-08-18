# Фронт: 404 после деплоя — нужен SPA fallback

После заливки production-сборки React сервер отдаёт **Not Found**.

Сборка: папка **`dist/`** (`index.html` + `assets/*`).

---

## В чём дело

Это SPA (React Router). Маршруты вроде:

- `/`
- `/login`
- `/dashboard`
- `/repairs/new`
- `/repairs/{id}`
- `/public/vehicles/{token}`
- `/legal/privacy`

живут на клиенте. Сервер должен для них отдавать **`index.html`**, а не 404 Laravel/nginx.

API (`/api/v1/...`) — без изменений, как сейчас.

---

## Что сделать

1. Раздавать статику из содержимого **`dist/`** (не из исходников репозитория).
2. Добавить SPA fallback: любой front-URL → `index.html`, если это не файл из `assets/`.

### Nginx (пример)

```nginx
# Фронт
root /path/to/frontend/dist;
index index.html;

location /assets/ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location / {
    try_files $uri $uri/ /index.html;
}

# API — отдельным location (как у вас сейчас)
location /api/ {
    # ваш proxy / php-fpm к Laravel
}
```

### Если фронт лежит в Laravel `public/`

Нельзя, чтобы Laravel ловил `/dashboard` и отвечал 404.

Нужен catch-all **после** API-роутов, который отдаёт `index.html` фронта, например:

```php
// routes/web.php — в самом конце
Route::view('/{any?}', 'app')->where('any', '.*');
// или File::get(public_path('index.html')) / аналогично
```

Главное: `/api/v1/*` обрабатывается API, всё остальное — `index.html` SPA.

### Apache (если используете)

В корне раздачи фронта `.htaccess`:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## Проверка после фикса

- [ ] `https://домен/` открывается (логин / приложение)
- [ ] `https://домен/login` открывается напрямую (не 404)
- [ ] F5 на `/dashboard` — не 404
- [ ] `https://домен/public/vehicles/{token}` — публичная карточка
- [ ] `https://домен/api/v1/...` — API как раньше
- [ ] В Network грузятся `/assets/*.js` и `/assets/*.css` (статус 200)

---

## Коротко

> Document root = `dist/`. Для всех URL кроме `/api/` и реальных файлов — отдавай `index.html`.
> Иначе React Router на сервере получает 404.
