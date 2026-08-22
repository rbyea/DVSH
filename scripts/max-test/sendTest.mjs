import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const LOCAL_CONFIG_PATH = join(REPO_ROOT, 'docs/max-bot.local');
const API_BASE = 'https://platform-api2.max.ru';
const INTERVAL_MS = 10 * 60 * 1000;

function loadConfig() {
  if (!existsSync(LOCAL_CONFIG_PATH)) {
    console.error(`Нет файла конфига: ${LOCAL_CONFIG_PATH}`);
    console.error('Создайте файл с содержимым:');
    console.error('  MAX_ACCESS_TOKEN=<токен бота из MAX для бизнеса>');
    console.error('  CHAT_ID=<id диалога (необязательно — определится сам)>');
    console.error('  USER_ID=<id пользователя (необязательно — определится сам)>');
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
  const lines = [`MAX_ACCESS_TOKEN=${config.MAX_ACCESS_TOKEN}`];

  if (config.CHAT_ID) {
    lines.push(`CHAT_ID=${config.CHAT_ID}`);
  }

  if (config.USER_ID) {
    lines.push(`USER_ID=${config.USER_ID}`);
  }

  writeFileSync(LOCAL_CONFIG_PATH, `${lines.join('\n')}\n`, 'utf8');
}

async function maxApi(token, method, pathname, body) {
  const query = method === 'POST' && body?.query ? `?${body.query}` : '';
  const response = await fetch(`${API_BASE}${pathname}${query}`, {
    method,
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' && body?.payload ? JSON.stringify(body.payload) : undefined,
  });
  const payloadText = await response.text();
  let payload = null;

  if (payloadText) {
    try {
      payload = JSON.parse(payloadText);
    } catch {
      payload = payloadText;
    }
  }

  return { ok: response.ok, status: response.status, payload };
}

async function sendMessage(token, { chatId, userId }, text) {
  if (chatId) {
    const result = await maxApi(token, 'POST', '/messages', {
      query: `chat_id=${chatId}`,
      payload: { text, notify: true },
    });

    if (result.ok || result.status !== 400) {
      return result;
    }
  }

  if (userId) {
    return maxApi(token, 'POST', '/messages', {
      query: `user_id=${userId}`,
      payload: { text, notify: true },
    });
  }

  return { ok: false, status: 0, payload: { description: 'нет chat_id и user_id' } };
}

async function resolveRecipient(token) {
  const { ok, status, payload } = await maxApi(token, 'GET', '/updates', null);

  if (!ok) {
    console.error('GET /updates не удался:', status, JSON.stringify(payload));
    return null;
  }

  const updates = payload?.updates ?? payload?.result ?? [];

  if (updates.length === 0) {
    return null;
  }

  for (const update of [...updates].reverse()) {
    if (!update.chat_id) {
      continue;
    }

    if (!['bot_stopped', 'bot_removed', 'dialog_removed'].includes(update.update_type)) {
      return { chatId: update.chat_id, userId: update.user?.id };
    }
  }

  return null;
}

async function sendTestMessage(token, recipient, sequence, botName) {
  const now = new Date().toLocaleTimeString('ru-RU');
  const text = [
    `Тест Автовидно #${sequence}`,
    `Время: ${now}`,
    botName ? `Бот: ${botName}` : '',
    'Если вы это видите — бот доставляет сообщения в MAX.',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await sendMessage(token, recipient, text);

  if (!result.ok) {
    console.error(
      `[${new Date().toLocaleString('ru-RU')}] отправка не удалась:`,
      result.status,
      JSON.stringify(result.payload),
    );
    return;
  }

  console.log(
    `[${new Date().toLocaleString('ru-RU')}] отправлено #${sequence} (chat_id=${recipient.chatId ?? '-'}, user_id=${recipient.userId ?? '-'})`,
  );
}

async function run() {
  const config = loadConfig();

  if (!config.MAX_ACCESS_TOKEN) {
    console.error('MAX_ACCESS_TOKEN не заполнен в', LOCAL_CONFIG_PATH);
    process.exit(1);
  }

  if (config.INSECURE_TLS === '1') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('Предупреждение: проверка TLS отключена (INSECURE_TLS=1)');
  }

  const meResult = await maxApi(config.MAX_ACCESS_TOKEN, 'GET', '/me', null);

  if (!meResult.ok) {
    console.error(
      'Токен не принят (GET /me):',
      meResult.status,
      JSON.stringify(meResult.payload),
    );
    console.error('Токен берётся в MAX для бизнеса -> Чат-боты -> Расширенные настройки');
    process.exit(1);
  }

  const botName = meResult.payload?.name ?? 'бот';

  let recipient = {
    chatId: config.CHAT_ID || null,
    userId: config.USER_ID || null,
  };

  if (!recipient.chatId && !recipient.userId) {
    console.log(`Бот «${botName}» подключён.`);
    console.log('Напишите боту в MAX любое сообщение (или добавьте его в чат), затем...');
    recipient = await resolveRecipient(config.MAX_ACCESS_TOKEN);

    if (!recipient) {
      console.error('Не удалось определить получателя. Напишите боту в MAX и запустите снова.');
      process.exit(1);
    }

    config.CHAT_ID = String(recipient.chatId);
    config.USER_ID = recipient.userId != null ? String(recipient.userId) : '';
    saveConfig(config);
    console.log(`Получатель сохранён: chat_id=${config.CHAT_ID}, user_id=${config.USER_ID}`);
  }

  let sequence = 0;
  const sendNext = async () => {
    sequence += 1;
    await sendTestMessage(config.MAX_ACCESS_TOKEN, recipient, sequence, botName);
  };

  await sendNext();
  console.log(`Следующее сообщение через ${INTERVAL_MS / 60000} минут. Ctrl+C — выход.`);
  setInterval(sendNext, INTERVAL_MS);
}

run();