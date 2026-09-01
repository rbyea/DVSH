export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function mapLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (host.includes('2gis')) {
      return 'Открыть в 2ГИС';
    }

    if (host.includes('yandex')) {
      return 'Открыть в Яндекс.Картах';
    }
  } catch {
    // fall through
  }

  return 'Открыть на карте';
}
