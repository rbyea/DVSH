/** Cyrillic letters allowed on RU plates (and Latin lookalikes → Cyrillic). */
const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  Y: 'У',
  X: 'Х',
};

const PLATE_LETTERS = new Set(['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х']);

function normalizePlateChar(char: string): string {
  const upper = char.toUpperCase();

  return LATIN_TO_CYRILLIC[upper] ?? upper;
}

type RuLicensePlateParts = {
  seriesLetter: string;
  number: string;
  series: string;
  region: string;
};

/** Parse typed value into RU plate slots: L + DDD + LL + DDD. */
export function extractRuLicensePlateParts(value: string): RuLicensePlateParts {
  const parts: RuLicensePlateParts = {
    seriesLetter: '',
    number: '',
    series: '',
    region: '',
  };

  for (const raw of value) {
    const char = normalizePlateChar(raw);
    const isLetter = PLATE_LETTERS.has(char);
    const isDigit = /\d/.test(char);

    if (!isLetter && !isDigit) {
      continue;
    }

    if (!parts.seriesLetter) {
      if (isLetter) {
        parts.seriesLetter = char;
      }
      continue;
    }

    if (parts.number.length < 3) {
      if (isDigit) {
        parts.number += char;
      }
      continue;
    }

    if (parts.series.length < 2) {
      if (isLetter) {
        parts.series += char;
      }
      continue;
    }

    if (parts.region.length < 3 && isDigit) {
      parts.region += char;
    }
  }

  return parts;
}

/** Format as А123ВС 777 while typing. */
export function formatRuLicensePlateInput(value: string): string {
  const { seriesLetter, number, series, region } = extractRuLicensePlateParts(value);
  const body = `${seriesLetter}${number}${series}`;

  if (!region) {
    return body;
  }

  return `${body} ${region}`;
}

/** Visual mask under the input: `А ___ __ ___` with typed chars filled in. */
export function formatRuLicensePlateMask(value: string): string {
  const { seriesLetter, number, series, region } = extractRuLicensePlateParts(value);

  return [
    seriesLetter || '_',
    number.padEnd(3, '_'),
    series.padEnd(2, '_'),
    region.padEnd(3, '_'),
  ].join(' ');
}

/** Same mask format for the input value itself. */
export function formatRuLicensePlateMaskedInput(value: string): string {
  return formatRuLicensePlateMask(value);
}

/** Compact value without spaces/underscores. */
export function normalizeRuLicensePlate(value: string): string {
  return formatRuLicensePlateInput(value).replace(/\s+/g, '');
}

export function isValidRuLicensePlate(value: string): boolean {
  return /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/.test(normalizeRuLicensePlate(value));
}
