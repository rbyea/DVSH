/** Remote API root (no trailing slash). */
export const REMOTE_API_BASE_URL = 'https://autovidno.tw1.ru/api/v1';

/**
 * In DEV we call same-origin `/api/v1` and Vite proxies to REMOTE_API_BASE_URL.
 * `import.meta.env.DEV` is built into Vite and does not depend on `.env` files.
 */
export const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : REMOTE_API_BASE_URL;
