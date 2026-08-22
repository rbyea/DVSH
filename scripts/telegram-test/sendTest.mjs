import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const LOCAL_CONFIG_PATH = join(REPO_ROOT, 'docs/telegram-bot.local');
const INTERVAL_MS = 10 * 60 * 1000;

function configureProxy(config) {
  const proxy = config.HTTPS_PROXY ?? config.HTTP_PROXY ?? process.env.HTTPS_PROXY;

  if (!proxy) {
    console.log('Прокси не задан (HTTPS_PROXY в telegram-bot.local). Работаем напрямую.');
    return;
  }

  setGlobalDispatcher(new ProxyAgent(proxy));
  console.log(`Используем прокси: ${proxy}`);
}

function loadConfig() {
  if (!existsSync(LOCAL_CONFIG_PATH)) {
    console.error(`Нет файла конфига: ${LOCAL_CONFIG_PATH}`);
    console.error('Создайте файл с содержимым:');
    console.error('  TELEGRAM_BOT_TOKEN=<токен от @BotFather>');
    console.error('  CHAT_ID=<ваш Telegram id (необязательно — определится сам)>');
    process.exit(1);
  }

  const raw = readFileSync(LOCAL_CONFIG_PATH, 'utf8');
  const config = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const sepIndex = trimmed.indexOf('=');

    if (sepIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, sepIndex).trim();
    const value = trimmed.slice(sepIndex + 1).trim();
    config[key] = value;
  }

  return config;
}

function saveConfig(config) {
  const lines = [`TELEGRAM_BOT_TOKEN=${config.TELEGRAM_BOT_TOKEN}`];

  if (config.CHAT_ID) {
    lines.push(`CHAT_ID=${config.CHAT_ID}`);
  }

  if (config.HTTPS_PROXY) {
    lines.push(`HTTPS_PROXY=${config.HTTPS_PROXY}`);
  }

  writeFileSync(LOCAL_CONFIG_PATH, `${lines.join('\n')}\n`, 'utf8');
}

async function telegramApi(token, method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => null);

  return { ok: response.ok, status: response.status, payload };
}

async function resolveChatId(token) {
  const { ok, status, payload } = await telegramApi(token, 'getUpdates', {
    timeout: 30,
    allowed_updates: ['message'],
  });

  if (!ok) {
    if (status === 409) {
      console.error(
        'У бота настроен webhook — getUpdates недоступен. Отключите webhook:',
        '  POST https://api.telegram.org/bot<TOKEN>/deleteWebhook',
      );
    } else {
      console.error('getUpdates не удался:', status, JSON.stringify(payload));
    }
    return null;
  }

  const updates = payload?.result ?? [];

  if (updates.length === 0) {
    return null;
  }

  for (const update of [...updates].reverse()) {
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;

    if (chatId) {
      return String(chatId);
    }
  }

  return null;
}

async function sendTestMessage(token, chatId, sequence) {
  const now = new Date().toLocaleTimeString('ru-RU');
  const text = [
    `Тест Автовидно #${sequence}`,
    `Время: ${now}`,
    'Если вы это видите — бот доставляет сообщения.',
  ].join('\n');

  const { ok, payload } = await telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
  });

  if (!ok) {
    console.error(
      `[${new Date().toLocaleString('ru-RU')}] отправка не удалась:`,
      payload?.description ?? 'неизвестная ошибка',
    );
    return;
  }

  console.log(`[${new Date().toLocaleString('ru-RU')}] отправлено #${sequence} в ${chatId}`);
}

async function run() {
  const config = loadConfig();

  if (!config.TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN не заполнен в', LOCAL_CONFIG_PATH);
    process.exit(1);
  }

  configureProxy(config);

  let chatId = config.CHAT_ID;

  if (!chatId) {
    console.log('CHAT_ID не указан. Нажмите Start у бота, затем...');
    chatId = await resolveChatId(config.TELEGRAM_BOT_TOKEN);

    if (!chatId) {
      console.error('Не удалось определить chat_id. Нажмите Start у бота и запустите снова.');
      process.exit(1);
    }

    config.CHAT_ID = chatId;
    saveConfig(config);
    console.log(`chat_id сохранён: ${chatId}`);
  }

  let sequence = 0;
  const sendNext = async () => {
    sequence += 1;
    await sendTestMessage(config.TELEGRAM_BOT_TOKEN, chatId, sequence);
  };

  await sendNext();
  console.log(`Следующее сообщение через ${INTERVAL_MS / 60000} минут. Ctrl+C — выход.`);
  setInterval(sendNext, INTERVAL_MS);
}

run();
