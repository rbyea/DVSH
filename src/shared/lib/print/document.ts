import { escapeHtml } from './html';

export const PRINT_DOCUMENT_CSS = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: #111;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    h1 { margin: 0 0 2px; font-size: 22px; text-align: center; letter-spacing: -0.02em; }
    .doc-number { margin: 0 0 16px; text-align: center; color: #333; font-size: 14px; }
    h2 { margin: 20px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; }
    .brand {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #111;
    }
    .brand-mark { display: flex; align-items: center; gap: 10px; }
    .brand-name { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
    .brand-sub { color: #555; font-size: 11px; }
    .station-block { text-align: right; font-size: 12px; line-height: 1.45; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .meta div { border-bottom: 1px solid #ddd; padding: 6px 0; }
    .label { display: block; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; gap: 24px; }
    .sign { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sign-line { margin-top: 36px; border-top: 1px solid #333; padding-top: 6px; }
    @media print {
      body { padding: 0; }
      @page { margin: 14mm; }
    }
`;

export function wrapPrintDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
${PRINT_DOCUMENT_CSS}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

export function printHtmlDocument(title: string, html: string): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', title);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  const previousTitle = document.title;
  document.title = title;

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  frameWindow.focus();
  frameWindow.print();

  window.setTimeout(() => {
    document.title = previousTitle;
    iframe.remove();
  }, 1000);

  return true;
}
