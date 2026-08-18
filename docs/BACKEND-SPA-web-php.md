# Fix: routes/web.php — раздача React SPA

Сейчас у вас:

```php
<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
```

Из‑за этого:

- `/` → welcome Laravel
- `/login` → 404

---

## Что сделать

### 1. Положить фронт в `public/`

Содержимое папки **`dist/`** (после `npm run build`) скопировать в Laravel **`public/`**:

```
public/
  index.html          ← из dist/index.html
  assets/
    index-XXXX.js
    index-XXXX.css
  favicon.svg         ← если есть
```

**Не затирать** `public/index.php` и `.htaccess` Laravel.

Если конфликт имён: держать SPA-файлы как есть рядом с `index.php`.  
Главное — чтобы был файл `public/index.html` от фронта.

### 2. Заменить `routes/web.php` на:

```php
<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SPA fallback (React)
|--------------------------------------------------------------------------
| API живёт в routes/api.php под /api/v1 — сюда не попадает.
| Все остальные GET → public/index.html (React Router).
*/

Route::get('/{any?}', function () {
    $index = public_path('index.html');

    abort_unless(File::exists($index), 404, 'SPA index.html not found in public/');

    return response(File::get($index), 200)
        ->header('Content-Type', 'text/html; charset=UTF-8');
})->where('any', '.*');
```

`welcome` больше не нужен для корня.

### 3. Проверка

- [ ] `https://autovidno.tw1.ru/` → логин / приложение Автовидно (не Laravel welcome)
- [ ] `https://autovidno.tw1.ru/login` → страница логина, не 404
- [ ] `https://autovidno.tw1.ru/assets/...js` → 200
- [ ] `https://autovidno.tw1.ru/api/v1/...` → API как раньше

---

## Коротко

> Убрать `view('welcome')`. Положить `dist/*` в `public/`. В `web.php` — один catch-all, который
> отдаёт `public/index.html`.
